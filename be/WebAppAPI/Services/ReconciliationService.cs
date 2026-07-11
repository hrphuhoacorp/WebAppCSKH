using System.Text.Json;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WebAppInfractor.Data;
using WebAppInfractor.Models;
using WebAppInfractor.Models.Reconciliation;

public interface IReconciliationService
{
    Task<ReconciliationRunSummaryDTO> RunReconciliationAsync(int month, int year, IFormFile file, int userId);
    Task<List<ReconciliationRunSummaryDTO>> GetRunsAsync(int? month, int? year);
    Task<List<ReconciliationRunSummaryDTO>> GetTrendAsync();
    Task<ReconciliationRunDetailDTO> GetRunDetailAsync(int runId);
    Task<ConfirmDeleteExcessRowsResultDTO> ConfirmDeleteExcessRowsAsync(int runId, List<int> excessRowIds, int userId);
}

public class ReconciliationService : IReconciliationService
{
    private readonly MemBerContext _context;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IOrderService _orderService;
    private readonly IUserRepository _userRepository;
    private readonly IActivityService _auditLogService;
    private readonly MediaSettings _mediaSettings;

    public ReconciliationService(
        MemBerContext context,
        IUnitOfWork unitOfWork,
        IOrderService orderService,
        IUserRepository userRepository,
        IActivityService auditLogService,
        IOptions<MediaSettings> mediaOptions
    )
    {
        _context = context;
        _unitOfWork = unitOfWork;
        _orderService = orderService;
        _userRepository = userRepository;
        _auditLogService = auditLogService;
        _mediaSettings = mediaOptions.Value;
    }

    public async Task<ReconciliationRunSummaryDTO> RunReconciliationAsync(int month, int year, IFormFile file, int userId)
    {
        if (file == null || file.Length == 0)
            throw new BadRequestException("File không hợp lệ");
        if (month < 1 || month > 12)
            throw new BadRequestException("Tháng không hợp lệ");

        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            ms.Seek(0, SeekOrigin.Begin);

            using var workbook = new XLWorkbook(ms);
            var worksheet = workbook.Worksheet(1);
            var allRows = worksheet.RangeUsed()?.RowsUsed().ToList() ?? new List<IXLRangeRow>();
            if (allRows.Count < 2)
                throw new BadRequestException("File Excel không có dữ liệu hoặc thiếu dòng tiêu đề.");

            // Dùng đúng parser dùng chung với Import — đảm bảo đọc đúng cùng 1 format cột
            var columnMap = SapoExcelRowParser.ParseHeader(allRows[0]);
            SapoExcelRowParser.EnsureNoMissingColumns(columnMap);

            var sourceRows = new List<SapoImportRowDTO>();
            foreach (var row in allRows.Skip(1))
            {
                try
                {
                    var parsed = SapoExcelRowParser.ParseRow(row, columnMap);
                    // Chỉ giữ đúng dòng thuộc kỳ đang rà soát — phòng trường hợp file có lẫn kỳ khác
                    if (parsed.PurchaseDate.Month == month && parsed.PurchaseDate.Year == year)
                        sourceRows.Add(parsed);
                }
                catch (BadRequestException)
                {
                    // Bỏ qua dòng lỗi định dạng (ngày sai, thiếu mã khách/mã đơn) — không chặn cả lần rà soát
                }
            }

            var monthStart = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
            var monthEnd = monthStart.AddMonths(1);

            var dbRows = await (
                from oi in _context.Set<OrderItem>()
                join o in _context.Set<Order>() on oi.OrderId equals o.Id
                where o.DeletedAt == null && o.PurchaseDate >= monthStart && o.PurchaseDate < monthEnd
                select new
                {
                    OrderItemId = oi.Id,
                    OrderId = o.Id,
                    o.OrderCode,
                    o.PurchaseDate,
                    oi.Sku,
                    oi.ServiceName,
                    oi.Quantity,
                    oi.Revenue,
                    o.ImportHistoryId,
                    o.BranchesId,
                    o.Source,
                }
            ).AsNoTracking().ToListAsync();

            // Định danh 1 dòng = Mã đơn + Ngày + SKU + Dịch vụ — KHÔNG gồm doanh thu/số lượng.
            // Lý do: nếu gộp chung doanh thu/SL vào khóa so khớp (như cách Import dùng để chống
            // trùng), chỉ cần lệch 1đ làm tròn hoặc SL chênh chút xíu giữa 2 lần export là bị coi
            // "hoàn toàn không tồn tại" ở phía kia — báo dư/thiếu sai hàng loạt dù đơn vẫn có thật.
            // Ở đây tách riêng: xác định dòng có tồn tại hay không theo định danh, rồi so sánh
            // GIÁ TRỊ (doanh thu/SL) của dòng đã xác định là cùng 1 giao dịch.
            static string MakeIdentityKey(string code, DateTime date, string sku, string svc) =>
                $"{code}|{date:yyyyMMdd}|{sku.Trim().ToUpperInvariant()}|{svc.Trim().ToUpperInvariant()}";

            var dbByKey = dbRows
                .GroupBy(d => MakeIdentityKey(d.OrderCode, d.PurchaseDate, d.Sku ?? "", d.ServiceName ?? ""))
                .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.Revenue).ToList());
            var sourceByKey = sourceRows
                .GroupBy(r => MakeIdentityKey(r.OrderCode, r.PurchaseDate, r.Sku, r.ServiceName))
                .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.Revenue).ToList());

            var excessEntities = new List<ReconciliationExcessRow>();
            var missingEntities = new List<ReconciliationMissingRow>();

            foreach (var key in dbByKey.Keys.Union(sourceByKey.Keys))
            {
                var dbList = dbByKey.TryGetValue(key, out var dl) ? dl : new();
                var srcList = sourceByKey.TryGetValue(key, out var sl) ? sl : new();
                var pairCount = Math.Min(dbList.Count, srcList.Count);

                // Ghép cặp dòng cùng định danh giữa app và file nguồn (sắp theo doanh thu giảm
                // dần ở trên để ghép hợp lý khi 1 định danh có nhiều hơn 1 dòng), so sánh giá trị.
                for (int i = 0; i < pairCount; i++)
                {
                    var d = dbList[i];
                    var s = srcList[i];
                    var revenueMatch = ValuesMatch(d.Revenue, s.Revenue, 0);
                    var qtyMatch = ValuesMatch(d.Quantity, s.Quantity, 2);
                    if (revenueMatch && qtyMatch)
                        continue; // khớp hoàn toàn — không cần lưu gì

                    var noteParts = new List<string>();
                    if (!revenueMatch)
                        noteParts.Add($"Doanh thu app {d.Revenue:N0}đ ≠ file {s.Revenue:N0}đ (lệch {(d.Revenue - s.Revenue):N0}đ)");
                    if (!qtyMatch)
                        noteParts.Add($"SL app {d.Quantity} ≠ file {s.Quantity}");

                    excessEntities.Add(new ReconciliationExcessRow
                    {
                        OrderId = d.OrderId,
                        OrderItemId = d.OrderItemId,
                        OrderCode = d.OrderCode,
                        PurchaseDate = d.PurchaseDate,
                        Sku = d.Sku,
                        ServiceName = d.ServiceName,
                        Quantity = d.Quantity,
                        Revenue = d.Revenue,
                        SourceQuantity = s.Quantity,
                        SourceRevenue = s.Revenue,
                        MatchType = "value_mismatch",
                        Note = string.Join("; ", noteParts),
                        ImportHistoryId = d.ImportHistoryId,
                        BranchId = d.BranchesId,
                        Source = d.Source,
                    });
                }

                // Dòng dôi ra bên app (không ghép được với file nguồn) — dư thật
                for (int i = pairCount; i < dbList.Count; i++)
                {
                    var d = dbList[i];
                    // Tìm dòng active khác trùng Mã đơn + Ngày + SKU + Dịch vụ + SL nhưng khác đợt
                    // import — đúng dấu hiệu của bug Restore-trùng đã vá ở Phase 1.
                    var dup = dbRows.FirstOrDefault(x =>
                        x.OrderItemId != d.OrderItemId
                        && x.OrderCode == d.OrderCode
                        && x.PurchaseDate == d.PurchaseDate
                        && (x.Sku ?? "") == (d.Sku ?? "")
                        && (x.ServiceName ?? "") == (d.ServiceName ?? "")
                        && x.Quantity == d.Quantity
                        && x.ImportHistoryId != d.ImportHistoryId
                    );

                    excessEntities.Add(new ReconciliationExcessRow
                    {
                        OrderId = d.OrderId,
                        OrderItemId = d.OrderItemId,
                        OrderCode = d.OrderCode,
                        PurchaseDate = d.PurchaseDate,
                        Sku = d.Sku,
                        ServiceName = d.ServiceName,
                        Quantity = d.Quantity,
                        Revenue = d.Revenue,
                        MatchType = dup != null ? "duplicate" : "not_in_source",
                        DuplicateOfOrderId = dup?.OrderId,
                        DuplicateOfImportHistoryId = dup?.ImportHistoryId,
                        Note = dup != null
                            ? $"Trùng với đơn #{dup.OrderCode} (import #{dup.ImportHistoryId} ngày {dup.PurchaseDate:dd/MM/yyyy})"
                            : $"Có trong hệ thống nhưng không khớp file gốc tháng {month}/{year}",
                        ImportHistoryId = d.ImportHistoryId,
                        BranchId = d.BranchesId,
                        Source = d.Source,
                    });
                }

                // Dòng dôi ra bên file nguồn (không ghép được với app) — thiếu thật
                for (int i = pairCount; i < srcList.Count; i++)
                {
                    var s = srcList[i];
                    missingEntities.Add(new ReconciliationMissingRow
                    {
                        OrderCode = s.OrderCode,
                        PurchaseDate = s.PurchaseDate,
                        Sku = s.Sku,
                        ServiceName = s.ServiceName,
                        Quantity = s.Quantity,
                        Revenue = s.Revenue,
                        Source = s.Source,
                        BranchName = s.BranchName,
                    });
                }
            }

            // Bắt thêm lỗi nhập liệu khác (nghi sai ngày / nghi sai SKU) — chỉ là GỢI Ý, cần xác
            // minh thủ công, không tự tin tuyệt đối vì bản chất là suy đoán theo ngưỡng.
            DetectPossibleTypos(excessEntities, missingEntities);

            var nonDeletableTypes = new HashSet<string> { "value_mismatch", "possible_date_typo", "possible_sku_typo" };
            var trueExcess = excessEntities.Where(x => !nonDeletableTypes.Contains(x.MatchType)).ToList();
            var mismatchRows = excessEntities.Where(x => x.MatchType == "value_mismatch").ToList();

            var run = new ReconciliationRun
            {
                PeriodMonth = month,
                PeriodYear = year,
                SourceFileName = file.FileName,
                RunBy = userId,
                TotalExcessRows = trueExcess.Count,
                TotalExcessAmount = trueExcess.Sum(x => x.Revenue),
                TotalMissingRows = missingEntities.Count,
                TotalMissingAmount = missingEntities.Sum(x => x.Revenue),
                TotalMismatchRows = mismatchRows.Count,
                TotalMismatchAmount = mismatchRows.Sum(x => x.Revenue - (x.SourceRevenue ?? 0)),
            };
            _context.Set<ReconciliationRun>().Add(run);
            await _unitOfWork.SaveChangesAsync(); // ép DB sinh Id thật cho run

            foreach (var e in excessEntities)
                e.RunId = run.Id;
            foreach (var m in missingEntities)
                m.RunId = run.Id;
            _context.Set<ReconciliationExcessRow>().AddRange(excessEntities);
            _context.Set<ReconciliationMissingRow>().AddRange(missingEntities);

            // Lưu file Excel gốc vào disk để tra cứu sau này (giống Import)
            try
            {
                var saveFolder = Path.Combine(_mediaSettings.RootPath, "reconciliation-excel");
                Directory.CreateDirectory(saveFolder);
                var safeFileName = $"{run.Id}_{Path.GetFileName(file.FileName)}";
                var savePath = Path.Combine(saveFolder, safeFileName);
                ms.Seek(0, SeekOrigin.Begin);
                await using var fs = new FileStream(savePath, FileMode.Create);
                await ms.CopyToAsync(fs);
                run.SourceFilePath = $"reconciliation-excel/{safeFileName}";
                _context.Entry(run).State = EntityState.Modified;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Reconciliation] Không lưu được file Excel: {ex.Message}");
            }

            var author = await _userRepository.GetAll().FirstOrDefaultAsync(u => u.Id == userId);
            await _auditLogService.SaveLogAsync(
                userId: author.Id,
                staffCode: author.StaffCode,
                action: "Reconciliation_Run",
                tableName: "reconciliation_runs",
                recordId: run.Id,
                oldData: null,
                newData: JsonSerializer.Serialize(
                    new
                    {
                        Message = $"Rà soát tháng {month}/{year}: {run.TotalExcessRows} dòng dư ({run.TotalExcessAmount:N0}đ), {run.TotalMissingRows} dòng thiếu ({run.TotalMissingAmount:N0}đ), {run.TotalMismatchRows} dòng lệch giá trị.",
                    }
                )
            );

            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();

            return MapRun(run, author?.Name);
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<List<ReconciliationRunSummaryDTO>> GetRunsAsync(int? month, int? year)
    {
        var query = _context.Set<ReconciliationRun>().AsNoTracking().AsQueryable();
        if (month.HasValue)
            query = query.Where(r => r.PeriodMonth == month.Value);
        if (year.HasValue)
            query = query.Where(r => r.PeriodYear == year.Value);

        var runs = await query.OrderByDescending(r => r.RunAt).ToListAsync();
        var userIds = runs.Select(r => r.RunBy).Distinct().ToList();
        var users = await _userRepository.GetAll().Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.Name);

        return runs.Select(r => MapRun(r, users.GetValueOrDefault(r.RunBy))).ToList();
    }

    public async Task<List<ReconciliationRunSummaryDTO>> GetTrendAsync()
    {
        // 1 tháng có thể chạy rà soát nhiều lần (chạy lại sau khi sửa) — chỉ lấy lần MỚI NHẤT
        // của mỗi kỳ để biểu đồ xu hướng phản ánh đúng tình trạng hiện tại, không bị trùng cột.
        var allRuns = await _context.Set<ReconciliationRun>().AsNoTracking().ToListAsync();
        var latestPerPeriod = allRuns
            .GroupBy(r => new { r.PeriodYear, r.PeriodMonth })
            .Select(g => g.OrderByDescending(r => r.RunAt).First())
            .OrderBy(r => r.PeriodYear).ThenBy(r => r.PeriodMonth)
            .ToList();

        var userIds = latestPerPeriod.Select(r => r.RunBy).Distinct().ToList();
        var users = userIds.Count > 0
            ? await _userRepository.GetAll().Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.Name)
            : new();

        return latestPerPeriod.Select(r => MapRun(r, users.GetValueOrDefault(r.RunBy))).ToList();
    }

    public async Task<ReconciliationRunDetailDTO> GetRunDetailAsync(int runId)
    {
        var run = await _context.Set<ReconciliationRun>().AsNoTracking().FirstOrDefaultAsync(r => r.Id == runId);
        if (run == null)
            throw new NotFoundException("Không tìm thấy lần rà soát này.");

        var author = await _userRepository.GetAll().FirstOrDefaultAsync(u => u.Id == run.RunBy);

        var excessRows = await _context.Set<ReconciliationExcessRow>()
            .AsNoTracking()
            .Where(r => r.RunId == runId)
            .OrderBy(r => r.OrderCode)
            .Select(r => new ReconciliationExcessRowDTO
            {
                Id = r.Id,
                OrderId = r.OrderId,
                OrderItemId = r.OrderItemId,
                OrderCode = r.OrderCode,
                PurchaseDate = r.PurchaseDate,
                Sku = r.Sku,
                ServiceName = r.ServiceName,
                Quantity = r.Quantity,
                Revenue = r.Revenue,
                SourceQuantity = r.SourceQuantity,
                SourceRevenue = r.SourceRevenue,
                MatchType = r.MatchType,
                DuplicateOfOrderId = r.DuplicateOfOrderId,
                DuplicateOfImportHistoryId = r.DuplicateOfImportHistoryId,
                Note = r.Note,
                IsDeleted = r.IsDeleted,
                ImportHistoryId = r.ImportHistoryId,
                BranchId = r.BranchId,
                Source = r.Source,
            })
            .ToListAsync();

        var missingRows = await _context.Set<ReconciliationMissingRow>()
            .AsNoTracking()
            .Where(r => r.RunId == runId)
            .OrderBy(r => r.OrderCode)
            .Select(r => new ReconciliationMissingRowDTO
            {
                Id = r.Id,
                OrderCode = r.OrderCode,
                PurchaseDate = r.PurchaseDate,
                Sku = r.Sku,
                ServiceName = r.ServiceName,
                Quantity = r.Quantity,
                Revenue = r.Revenue,
                Source = r.Source,
                BranchName = r.BranchName,
                Note = r.Note,
            })
            .ToListAsync();

        // Truy ra gốc: batch import nào, ai nhập, batch đó hiện đang ở trạng thái gì, và
        // đã TỪNG bị rollback rồi restore lại chưa (đúng dấu hiệu nghi vấn ở bug Phase 1).
        var importHistoryIds = excessRows.Where(r => r.ImportHistoryId.HasValue).Select(r => r.ImportHistoryId!.Value).Distinct().ToList();
        var branchIds = excessRows.Where(r => r.BranchId.HasValue).Select(r => r.BranchId!.Value).Distinct().ToList();

        var importHistories = importHistoryIds.Count > 0
            ? await _context.Set<ImportsHistory>().AsNoTracking()
                .Where(h => importHistoryIds.Contains(h.Id))
                .Select(h => new { h.Id, h.Status, h.UserId })
                .ToListAsync()
            : new();
        var importerIds = importHistories.Where(h => h.UserId.HasValue).Select(h => h.UserId!.Value).Distinct().ToList();
        var importers = importerIds.Count > 0
            ? await _userRepository.GetAll().Where(u => importerIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.Name)
            : new();
        var branches = branchIds.Count > 0
            ? await _context.Set<Branch>().AsNoTracking().Where(b => branchIds.Contains(b.Id)).ToDictionaryAsync(b => b.Id, b => b.Name)
            : new();
        var restoredBatchIds = importHistoryIds.Count > 0
            ? (await _context.Set<ActivityLog>().AsNoTracking()
                .Where(a => a.TableName == "imports_history" && a.Action == "Restore_Excel_Import" && a.RecordId.HasValue && importHistoryIds.Contains(a.RecordId.Value))
                .Select(a => a.RecordId!.Value)
                .Distinct()
                .ToListAsync()).ToHashSet()
            : new HashSet<int>();

        var historyById = importHistories.ToDictionary(h => h.Id);
        foreach (var r in excessRows)
        {
            if (!r.ImportHistoryId.HasValue) continue;
            if (historyById.TryGetValue(r.ImportHistoryId.Value, out var h))
            {
                r.ImportBatchStatus = h.Status;
                r.ImportedByName = h.UserId.HasValue ? importers.GetValueOrDefault(h.UserId.Value) : null;
            }
            r.WasEverRestored = restoredBatchIds.Contains(r.ImportHistoryId.Value);
            if (r.BranchId.HasValue)
                r.BranchName = branches.GetValueOrDefault(r.BranchId.Value);
        }

        // Tổng hợp theo nhóm — dùng lại danh sách vừa gán Chi nhánh/Nguồn/Người nhập ở trên.
        // "Amount at risk": dòng dư dùng Revenue; dòng lệch giá trị dùng đúng phần chênh lệch
        // (Revenue - SourceRevenue) để khớp với TotalMismatchAmount ở cấp run.
        var problemRows = excessRows.Where(r => !r.IsDeleted).ToList();
        decimal AmountOf(ReconciliationExcessRowDTO r) => r.MatchType == "value_mismatch" ? r.Revenue - (r.SourceRevenue ?? 0) : r.Revenue;

        List<ReconciliationBreakdownItemDTO> GroupBy(Func<ReconciliationExcessRowDTO, string?> keySelector) =>
            problemRows
                .GroupBy(r => string.IsNullOrWhiteSpace(keySelector(r)) ? "Không rõ" : keySelector(r)!)
                .Select(g => new ReconciliationBreakdownItemDTO { Name = g.Key, Count = g.Count(), Amount = g.Sum(AmountOf) })
                .OrderByDescending(x => x.Amount)
                .ToList();

        var byBranch = GroupBy(r => r.BranchName);
        var bySource = GroupBy(r => r.Source);
        var byImporter = GroupBy(r => r.ImportedByName);

        return new ReconciliationRunDetailDTO
        {
            Run = MapRun(run, author?.Name),
            ExcessRows = excessRows,
            MissingRows = missingRows,
            ByBranch = byBranch,
            BySource = bySource,
            ByImporter = byImporter,
        };
    }

    public async Task<ConfirmDeleteExcessRowsResultDTO> ConfirmDeleteExcessRowsAsync(int runId, List<int> excessRowIds, int userId)
    {
        if (excessRowIds == null || excessRowIds.Count == 0)
            throw new BadRequestException("Chưa chọn dòng nào để xóa.");

        using var transaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            var rows = await _context.Set<ReconciliationExcessRow>()
                .Where(r => r.RunId == runId && excessRowIds.Contains(r.Id) && !r.IsDeleted)
                .ToListAsync();

            if (rows.Count == 0)
                throw new BadRequestException("Không tìm thấy dòng lệch hợp lệ để xóa (có thể đã được xóa trước đó).");

            // Dòng "lệch giá trị" hoặc "nghi ngờ sai ngày/SKU" vẫn là giao dịch có thật (hoặc
            // CHƯA CHẮC là dư) — KHÔNG được xóa (xóa sẽ mất doanh thu thật). Chỉ dòng dư thật
            // ('duplicate' / 'not_in_source') mới được phép xóa.
            var nonDeletableTypes = new HashSet<string> { "value_mismatch", "possible_date_typo", "possible_sku_typo" };
            if (rows.Any(r => nonDeletableTypes.Contains(r.MatchType)))
                throw new BadRequestException("Không thể xóa dòng 'Lệch giá trị' hoặc 'Nghi ngờ lỗi nhập liệu' — cần xác minh/đơn hàng vẫn có thật.");

            var orderItemIds = rows.Where(r => r.OrderItemId.HasValue).Select(r => r.OrderItemId!.Value).ToList();
            await _orderService.ReverseOrderItemsRevenueAsync(orderItemIds, userId);

            var now = DateTime.UtcNow;
            var totalAmount = rows.Sum(r => r.Revenue);
            foreach (var r in rows)
            {
                r.IsDeleted = true;
                r.DeletedAt = now;
                r.DeletedBy = userId;
                _context.Entry(r).State = EntityState.Modified;
            }

            var author = await _userRepository.GetAll().FirstOrDefaultAsync(u => u.Id == userId);
            await _auditLogService.SaveLogAsync(
                userId: author.Id,
                staffCode: author.StaffCode,
                action: "Reconciliation_Delete_Excess",
                tableName: "reconciliation_excess_rows",
                recordId: runId,
                oldData: null,
                newData: JsonSerializer.Serialize(
                    new { Message = $"Đã xóa {rows.Count} dòng lệch, hoàn {totalAmount:N0}đ doanh thu (rà soát #{runId})." }
                )
            );

            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();

            return new ConfirmDeleteExcessRowsResultDTO { DeletedCount = rows.Count, TotalAmountReversed = totalAmount };
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private static ReconciliationRunSummaryDTO MapRun(ReconciliationRun r, string? runByName) => new()
    {
        Id = r.Id,
        PeriodMonth = r.PeriodMonth,
        PeriodYear = r.PeriodYear,
        SourceFileName = r.SourceFileName,
        RunBy = r.RunBy,
        RunByName = runByName,
        RunAt = r.RunAt,
        TotalExcessRows = r.TotalExcessRows,
        TotalExcessAmount = r.TotalExcessAmount,
        TotalMissingRows = r.TotalMissingRows,
        TotalMissingAmount = r.TotalMissingAmount,
        TotalMismatchRows = r.TotalMismatchRows,
        TotalMismatchAmount = r.TotalMismatchAmount,
    };

    private static bool ValuesMatch(decimal a, decimal b, int decimals) =>
        Math.Round(a, decimals, MidpointRounding.AwayFromZero) == Math.Round(b, decimals, MidpointRounding.AwayFromZero);

    // Sau vòng so khớp định danh chính, thử ghép các dòng dư loại "not_in_source" còn lại
    // (KHÔNG áp dụng cho "duplicate" — đó đã là kết luận chắc chắn) với các dòng thiếu còn lại,
    // nới lỏng đúng 1 yếu tố (Ngày hoặc SKU) mỗi lần thử, để phát hiện khả năng gõ nhầm.
    // Luôn gắn nhãn "gợi ý — cần xác minh thủ công", không đổi bản chất "not_in_source" nếu
    // không tìm được cặp khớp nào.
    private static void DetectPossibleTypos(List<ReconciliationExcessRow> excessEntities, List<ReconciliationMissingRow> missingEntities)
    {
        var usedMissing = new HashSet<int>();

        foreach (var excess in excessEntities.Where(e => e.MatchType == "not_in_source"))
        {
            var matched = false;

            // Nghi sai ngày: cùng Mã đơn + SKU + Dịch vụ, ngày lệch 1-3 ngày, SL/doanh thu khớp
            for (int i = 0; i < missingEntities.Count && !matched; i++)
            {
                if (usedMissing.Contains(i)) continue;
                var m = missingEntities[i];
                if (m.OrderCode != excess.OrderCode) continue;
                if ((m.Sku ?? "") != (excess.Sku ?? "") || (m.ServiceName ?? "") != (excess.ServiceName ?? "")) continue;
                var dayDiff = Math.Abs((m.PurchaseDate - excess.PurchaseDate).TotalDays);
                if (dayDiff < 1 || dayDiff > 3) continue;
                if (!ValuesMatch(excess.Revenue, m.Revenue, 0) || !ValuesMatch(excess.Quantity, m.Quantity, 2)) continue;

                excess.MatchType = "possible_date_typo";
                excess.Note = $"Gợi ý — nghi sai ngày: file ghi ngày {m.PurchaseDate:dd/MM/yyyy}, app ghi ngày {excess.PurchaseDate:dd/MM/yyyy}. Cần xác minh thủ công.";
                m.Note = $"Gợi ý — nghi trùng với dòng dư mã {excess.OrderCode} app đang ghi ngày {excess.PurchaseDate:dd/MM/yyyy}. Cần xác minh thủ công.";
                usedMissing.Add(i);
                matched = true;
            }

            if (matched) continue;

            // Nghi sai SKU: cùng Mã đơn + Ngày + Dịch vụ, SKU gần giống (Levenshtein <= 2), SL/doanh thu khớp
            for (int i = 0; i < missingEntities.Count && !matched; i++)
            {
                if (usedMissing.Contains(i)) continue;
                var m = missingEntities[i];
                if (m.OrderCode != excess.OrderCode || m.PurchaseDate != excess.PurchaseDate) continue;
                if ((m.ServiceName ?? "") != (excess.ServiceName ?? "")) continue;
                if ((m.Sku ?? "") == (excess.Sku ?? "")) continue;
                if (LevenshteinDistance(m.Sku ?? "", excess.Sku ?? "") > 2) continue;
                if (!ValuesMatch(excess.Revenue, m.Revenue, 0) || !ValuesMatch(excess.Quantity, m.Quantity, 2)) continue;

                excess.MatchType = "possible_sku_typo";
                excess.Note = $"Gợi ý — nghi sai SKU: file ghi mã '{m.Sku}', app ghi mã '{excess.Sku}'. Cần xác minh thủ công.";
                m.Note = $"Gợi ý — nghi trùng với dòng dư SKU '{excess.Sku}' trong app. Cần xác minh thủ công.";
                usedMissing.Add(i);
                matched = true;
            }
        }
    }

    private static int LevenshteinDistance(string a, string b)
    {
        if (string.IsNullOrEmpty(a)) return string.IsNullOrEmpty(b) ? 0 : b.Length;
        if (string.IsNullOrEmpty(b)) return a.Length;

        var dp = new int[a.Length + 1, b.Length + 1];
        for (int i = 0; i <= a.Length; i++) dp[i, 0] = i;
        for (int j = 0; j <= b.Length; j++) dp[0, j] = j;

        for (int i = 1; i <= a.Length; i++)
        {
            for (int j = 1; j <= b.Length; j++)
            {
                var cost = a[i - 1] == b[j - 1] ? 0 : 1;
                dp[i, j] = Math.Min(Math.Min(dp[i - 1, j] + 1, dp[i, j - 1] + 1), dp[i - 1, j - 1] + cost);
            }
        }
        return dp[a.Length, b.Length];
    }
}
