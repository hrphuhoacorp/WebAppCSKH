'use client';

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Alert, Box, Button, Paper, Typography, alpha } from "@mui/material";
import { Download, Upload, HelpCircle } from "lucide-react";
import { PriceTag } from "../types";
import { GREEN, CARD_RADIUS, BORDER } from "../styles";

interface TemplateFeaturesProps {
  onTagsLoaded: (tags: PriceTag[]) => void;
  currentCount: number;
}

export default function TemplateFeatures({ onTagsLoaded, currentCount }: TemplateFeaturesProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<{
    type: "idle" | "success" | "error" | "loading";
    message: string;
  }>({
    type: "idle",
    message: ""
  });

  // Triggers downloading the sample Excel workbook template
  const handleDownloadTemplate = () => {
    try {
      const headers = [["Tên Sản Phẩm", "Xuất Xứ", "Giá", "Đơn Vị Tính"]];
      const ws = XLSX.utils.aoa_to_sheet(headers);

      ws["!cols"] = [
        { wch: 45 }, // Tên sản phẩm
        { wch: 20 }, // Xuất xứ
        { wch: 15 }, // Giá
        { wch: 15 }  // Đơn vị tính
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Danh Sach San Pham");
      XLSX.writeFile(wb, "mau_nhap_lieu_bang_gia.xlsx");

      setStatus({
        type: "success",
        message: "Tải file mẫu thành công! Hãy nhập dữ liệu vào file này rồi tải lại lên."
      });
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message: "Không thể tạo file mẫu. Vui lòng thử lại."
      });
    }
  };

  // Safe Excel file reading
  const processExcelFile = (file: File) => {
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls" && ext !== "csv") {
      setStatus({
        type: "error",
        message: "Sai định dạng file! Chỉ chấp nhận file Excel (.xlsx, .xls) hoặc .csv"
      });
      return;
    }

    setStatus({ type: "loading", message: "Đang phân tích dữ liệu Excel..." });

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("File empty");

        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        type ExcelCell = string | number | boolean | Date | undefined;
        const jsonRows = XLSX.utils.sheet_to_json<ExcelCell[]>(worksheet, { header: 1 });

        if (jsonRows.length < 2) {
          throw new Error("File không có dữ liệu hoặc không đủ số dòng dòng.");
        }

        const headerRow = jsonRows[0] || [];
        const normalizedHeaders = headerRow.map(h => String(h || "").trim().toLowerCase());

        let nameIdx = normalizedHeaders.findIndex(h => h.includes("tên") || h.includes("sản phẩm") || h.includes("name") || h.includes("title"));
        let originIdx = normalizedHeaders.findIndex(h => h.includes("xuất xứ") || h.includes("nguồn gốc") || h.includes("origin") || h.includes("xứ"));
        let priceIdx = normalizedHeaders.findIndex(h => h.includes("giá") || h.includes("price") || h.includes("tiền") || h.includes("cost"));
        let unitIdx = normalizedHeaders.findIndex(h => h.includes("đơn vị") || h.includes("unit") || h.includes("dvt") || h.includes("tính"));

        if (nameIdx === -1) nameIdx = 0;
        if (originIdx === -1) originIdx = 1;
        if (priceIdx === -1) priceIdx = 2;
        if (unitIdx === -1) unitIdx = 3;

        const importedTags: PriceTag[] = [];

        for (let i = 1; i < jsonRows.length; i++) {
          const row = jsonRows[i];
          if (!row || row.length === 0) continue;

          const rawName = row[nameIdx];
          if (!rawName) continue;

          const rawOrigin = row[originIdx] !== undefined ? String(row[originIdx]) : "Việt Nam";
          const rawPrice = row[priceIdx];
          const rawUnit = row[unitIdx] !== undefined ? String(row[unitIdx]) : "Hũ";

          let cleanPrice = 0;
          if (rawPrice !== undefined && rawPrice !== null) {
            if (typeof rawPrice === "number") {
              cleanPrice = rawPrice;
            } else {
              const digits = String(rawPrice).replace(/[^0-9]/g, "");
              cleanPrice = parseInt(digits, 10) || 0;
            }
          }

          importedTags.push({
            id: `excel-imported-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
            name: String(rawName).trim(),
            origin: String(rawOrigin).trim() || "Việt Nam",
            price: cleanPrice,
            unit: String(rawUnit).trim() || "Hộp"
          });
        }

        if (importedTags.length === 0) {
          setStatus({
            type: "error",
            message: "Không tìm thấy dữ liệu hợp lệ trong file. Vui lòng kiểm tra lại cấu trúc cột."
          });
          return;
        }

        onTagsLoaded(importedTags);
        setStatus({
          type: "success",
          message: `Nhập dữ liệu thành công! Đã nạp thành công ${importedTags.length} bảng giá vào danh sách.`
        });
      } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : "";
        setStatus({
          type: "error",
          message: `Lỗi phân tích file Excel. Chi tiết: ${message || "Vui lòng kiểm tra cấu trúc file mẫu."}`
        });
      }
    };

    reader.onerror = () => {
      setStatus({
        type: "error",
        message: "Không thể đọc nội dung file."
      });
    };

    reader.readAsBinaryString(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processExcelFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processExcelFile(e.target.files[0]);
    }
  };

  return (
    <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, p: 3, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)', mb: 2.5 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, alignItems: { lg: 'center' }, justifyContent: 'space-between', gap: 3 }}>
        {/* Left column: Template actions & info */}
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#1e293b' }}>
            📊 Dữ Liệu Excel Đầu Vào
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#64748b', mt: 0.5, maxWidth: 520, lineHeight: 1.6 }}>
            Ứng dụng hỗ trợ nạp dữ liệu từ file Excel có 4 cột: <Box component="span" sx={{ fontWeight: 700, color: '#334155' }}>Tên sản phẩm, Xuất xứ, Giá, Đơn vị tính</Box>. Tải file mẫu của chúng tôi để bảo đảm cấu trúc hoàn hảo nhất.
          </Typography>

          <Button
            onClick={handleDownloadTemplate}
            variant="outlined"
            startIcon={<Download size={16} />}
            sx={{ mt: 2, borderColor: alpha(GREEN, 0.4), color: GREEN, textTransform: 'none', fontWeight: 700, borderRadius: '10px', '&:hover': { bgcolor: alpha(GREEN, 0.06), borderColor: GREEN } }}
          >
            Tải File Excel Mẫu (.xlsx)
          </Button>
        </Box>

        {/* Right column: Drag & Drop upload container */}
        <Box
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          sx={{
            width: { xs: '100%', lg: 420 },
            border: '2px dashed',
            borderColor: dragActive ? GREEN : BORDER,
            bgcolor: dragActive ? alpha(GREEN, 0.04) : '#fff',
            borderRadius: '14px',
            p: 3,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all .15s',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            '&:hover': { borderColor: GREEN, bgcolor: alpha(GREEN, 0.03) },
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
          />

          <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: alpha(GREEN, 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center', color: GREEN }}>
            <Upload size={22} />
          </Box>

          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
            Kéo thả file Excel vào đây hoặc <Box component="span" sx={{ color: GREEN, fontWeight: 700 }}>click chọn file</Box>
          </Typography>
          <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>Hỗ trợ .xlsx, .xls, .csv</Typography>
        </Box>
      </Box>

      {/* Footer tip + counter */}
      <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, bgcolor: '#f8fafc', px: 1.25, py: 0.5, borderRadius: '6px' }}>
          <HelpCircle size={13} color="#94a3b8" />
          <Typography sx={{ fontSize: 11, color: '#64748b' }}>Tên cột có thể dùng chữ hoa/thường, không cần chính xác 100%</Typography>
        </Box>
        <Typography sx={{ fontSize: 12, color: '#475569', fontWeight: 600, ml: 'auto' }}>
          Hiện tại: <Box component="span" sx={{ color: GREEN, fontWeight: 800 }}>{currentCount}</Box> bảng giá đang đợi in.
        </Typography>
      </Box>

      {/* Status alert */}
      {status.type !== "idle" && (
        <Alert
          severity={status.type === "success" ? "success" : status.type === "error" ? "error" : "info"}
          onClose={() => setStatus({ type: "idle", message: "" })}
          sx={{ mt: 2, borderRadius: '10px' }}
        >
          {status.message}
        </Alert>
      )}
    </Paper>
  );
}
