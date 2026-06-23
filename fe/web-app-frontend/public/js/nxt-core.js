/*
  PHF_NXT_GioQua_WebPrototype
  FULL v0.5 - Prototype test nghiệp vụ

  Phạm vi:
  - Ngày cần kiểm tra / Sổ lệch cần xử lý
  - Parser Zalo nâng cấp
  - Chuyển CN
  - Sai mã theo ngày phát sinh
  - Sapo Excel .xlsx đọc thử bằng SheetJS CDN
  - Tất cả user xem/chọn tất cả chi nhánh trong prototype
*/

const APP_VERSION = "FULL_v0_5_12_NEXT_OPENING_SYNC_AFTER_CODE_CHANGE";
const OCR_HELPER_URL = "https://script.google.com/macros/s/AKfycbzRaxdoT45hrrJ9V0MwdPDLr59zRIp6CAbGYjr3AHlsAz3DBbBuLsadDShtJG75nf_D/exec";
let NXT_API = "http://localhost:5109/api/nxt";

function rowToDto(row) {
  return {
    closeDate: row.closeDate, branch: row.branch, itemCode: row.itemCode,
    openingStock: Number(row.openingStock) || 0, openingSource: row.openingSource || null,
    giftIn: Number(row.giftIn) || 0, receiveBranch: Number(row.receiveBranch) || 0,
    transferBranch: Number(row.transferBranch) || 0, cancelBasket: Number(row.cancelBasket) || 0,
    sapoSold: Number(row.sapoSold) || 0, adjustment: Number(row.adjustment) || 0,
    actualStock: Number(row.actualStock) || 0, soldNotPicked: Number(row.soldNotPicked) || 0,
    revenue: Number(row.revenue) || 0, orderCount: Number(row.orderCount) || 0,
    transferNotes: row.transferNotes || [], inactive: !!row.inactive
  };
}

function dbSaveRow(row) {
  return fetch(`${NXT_API}/rows/upsert`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(rowToDto(row)) })
    .then(res => { if (!res.ok) res.text().then(t => console.error("[NXT] upsert lỗi", res.status, t)); })
    .catch(err => console.error("[NXT] upsert network error", err));
}

function dbSyncBatch() {
  return fetch(`${NXT_API}/rows/batch`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(dashboardRows.map(rowToDto)) })
    .then(res => { if (!res.ok) res.text().then(t => { console.error("[NXT] batch lỗi", res.status, t); appNotify("Lưu dữ liệu thất bại! Xem Console (F12) để biết lỗi chi tiết.", "error", true); }); })
    .catch(err => { console.error("[NXT] batch network error", err); appNotify("Không kết nối được API để lưu dữ liệu.", "error", true); });
}

function dbSaveLog(entry) {
  return fetch(`${NXT_API}/logs`, {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({
      closeDate: entry.closeDate, branch: entry.branch, type: entry.type,
      source: entry.source || null, wrongCode: entry.wrongCode, rightCode: entry.rightCode,
      qty: Number(entry.qty) || 0, note: entry.note || null,
      loginCode: currentUser?.loginCode || "",
      userName: entry.user,
      status: entry.status, detail: entry.detail || null
    })
  }).then(async res => {
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.content?.id) entry.id = data.content.id;
    }
  }).catch(err => console.error("[NXT] log error", err));
}

function dbClearLogs() {
  fetch(`${NXT_API}/logs`, { method: "DELETE" }).catch(() => { });
}

const BRANCH_ALIASES = {
  "PL": "Phú Lợi", "PHU LOI": "Phú Lợi", "PHÚ LỢI": "Phú Lợi",
  "NQ": "Ngô Quyền", "NGO QUYEN": "Ngô Quyền", "NGÔ QUYỀN": "Ngô Quyền",
  "LT": "Lái Thiêu", "LAI THIEU": "Lái Thiêu", "LÁI THIÊU": "Lái Thiêu"
};

const VALID_CODE_PREFIX = /^(H|GT|BK|SON|TEMP|TMP|AT)[A-Z0-9-]*/i;


let currentUser = null;
let lastGiftInPreview = [];
let lastStockPreview = [];
let lastCancelPreview = [];
let lastTransferPreview = [];
let lastSapoPreview = [];
let lastAppliedSapoRows = [];
let lastAppliedSapoSignature = "";
let sapoImportHistory = {};
let adjustmentsLog = [];
let checkDayMeta = {};

let dashboardRows = [];
let overviewEditKey = null;
let overviewEditDraft = {};

const sapoSampleRows = [
  { closeDate: "15/06/2026", branch: "Phú Lợi", itemCode: "H1144", sapoSold: 1, orderCount: 1, revenue: 650000, note: "Bán thường" },
  { closeDate: "15/06/2026", branch: "Ngô Quyền", itemCode: "H1129", sapoSold: 1, orderCount: 1, revenue: 780000, note: "Bán thường" },
  { closeDate: "15/06/2026", branch: "Lái Thiêu", itemCode: "H1133", sapoSold: -1, orderCount: -1, revenue: -590000, note: "Trả hàng âm giữ để trừ" }
];

function number(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const s = String(value || "").replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value) {
  return number(value).toLocaleString("vi-VN") + "đ";
}

function trimZeroDecimal(text) {
  return String(text || "").replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
}

function formatCompactMoney(value) {
  const n = number(value);
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1e9) {
    const digits = abs >= 10e9 ? 1 : 2;
    return sign + trimZeroDecimal((abs / 1e9).toFixed(digits)) + " Tỷ";
  }
  if (abs >= 1e6) {
    const digits = abs >= 10e6 ? 1 : 2;
    return sign + trimZeroDecimal((abs / 1e6).toFixed(digits)) + " Tr";
  }
  if (abs >= 1e3) {
    const digits = abs >= 10e3 ? 0 : 1;
    return sign + trimZeroDecimal((abs / 1e3).toFixed(digits)) + "K";
  }
  return sign + abs.toLocaleString("vi-VN") + "đ";
}

function removeAccent(str) {
  return String(str || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D");
}

function normBranch(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const upper = removeAccent(raw).toUpperCase();
  return BRANCH_ALIASES[upper] || raw;
}

function isoToDisplay(isoDate) {
  if (!isoDate) return "";
  if (isoDate.includes("/")) return isoDate;
  if (!isoDate.includes("-")) return isoDate;
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

function displayToIso(displayDate) {
  if (!displayDate) return "";
  if (displayDate.includes("-")) return displayDate;
  const parts = displayDate.split("/");
  if (parts.length !== 3) return displayDate;
  return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
}

function addDaysToDisplayDate(displayDate, days) {
  const iso = displayToIso(displayDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const date = new Date(iso + "T00:00:00");
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${d}/${m}/${y}`;
}

function setNextDayOpeningFromActual({ closeDate, branch, itemCode, actualStock }) {
  const nextDate = addDaysToDisplayDate(closeDate, 1);
  if (!nextDate) return;
  upsertDashboardRow({ closeDate: nextDate, branch, itemCode, patch: {} });
  const nextRow = dashboardRows.find(r => r.closeDate === nextDate && r.branch === branch && r.itemCode === itemCode);
  if (!nextRow) return;
  // Theo nghiệp vụ vận hành: tồn đầu ngày sau lấy theo Tồn thực tế cuối ngày trước.
  // DTT dùng để trừ khi so lệch trong ngày; CTT chỉ gắn nhãn trong tồn thực tế. Tồn đầu ngày sau lấy theo tồn thực tế.
  nextRow.openingStock = number(actualStock);
  nextRow.openingSource = `Tự lấy từ tồn thực tế cuối ngày ${closeDate}`;
  nextRow.inactive = false;
  dbSaveRow(nextRow);
}

function syncNextDayOpeningAfterCodeChange(closeDate, branch, wrongCode, rightCode, qty) {
  const nextDate = addDaysToDisplayDate(closeDate, 1);
  const requestedQty = Math.abs(number(qty));
  if (!nextDate || !branch || !wrongCode || !rightCode || requestedQty <= 0) {
    return { synced: false, qty: 0, detail: "Không đủ dữ liệu để đồng bộ tồn đầu ngày kế tiếp." };
  }

  const wrongNext = findDashboardRow(nextDate, branch, wrongCode);
  const wrongOpening = number(wrongNext?.openingStock);
  if (!wrongNext || wrongOpening <= 0) {
    return { synced: false, qty: 0, detail: `Không thấy tồn đầu ${wrongCode} ở ngày kế tiếp ${nextDate}.` };
  }

  // Chỉ chuyển đúng phần tồn đầu còn đang nằm ở mã cũ.
  // Không cascade sang các ngày sau và không đụng Sapo/Gói ra/Hủy/Chuyển/Tồn thực tế của ngày kế tiếp.
  const syncQty = Math.min(wrongOpening, requestedQty);
  if (syncQty <= 0) {
    return { synced: false, qty: 0, detail: `Tồn đầu ${wrongCode} ngày ${nextDate} không đủ để chuyển.` };
  }

  upsertDashboardRow({ closeDate: nextDate, branch, itemCode: rightCode, patch: {} });
  const rightNext = findDashboardRow(nextDate, branch, rightCode);
  if (!rightNext) {
    return { synced: false, qty: 0, detail: `Không tạo được dòng tồn đầu ${rightCode} ngày ${nextDate}.` };
  }

  wrongNext.openingStock = number(wrongNext.openingStock) - syncQty;
  rightNext.openingStock = number(rightNext.openingStock) + syncQty;
  rightNext.openingSource = `Đồng bộ sau đổi mã từ tồn thực tế cuối ngày ${closeDate}`;
  rightNext.inactive = false;

  cleanupZeroFields(wrongNext);
  cleanupZeroFields(rightNext);
  deactivateIfEmpty(wrongNext);
  dbSaveRow(wrongNext);
  dbSaveRow(rightNext);

  return {
    synced: true,
    qty: syncQty,
    detail: `Đã chuyển tồn đầu ngày ${nextDate}: ${wrongCode} -${syncQty}, ${rightCode} +${syncQty}`
  };
}

function isDateInRange(displayDate, isoFrom, isoTo) {
  const iso = displayToIso(displayDate);
  if (isoFrom && iso < isoFrom) return false;
  if (isoTo && iso > isoTo) return false;
  return true;
}

function calcExpectedStock(row) {
  return number(row.openingStock) + number(row.giftIn) + number(row.receiveBranch)
    - number(row.transferBranch) - number(row.sapoSold) - number(row.cancelBasket)
    + number(row.adjustment);
}

function calcCompareStock(row) {
  return number(row.actualStock) - number(row.soldNotPicked);
}

function calcDiff(row) {
  return calcCompareStock(row) - calcExpectedStock(row);
}

function getDiffBadge(diff) {
  if (diff === 0) return '<span class="badge">Khớp</span>';
  return '<span class="badge bad">' + diff + '</span>';
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}


function appPopupElements() {
  return {
    overlay: document.getElementById("appPopupOverlay"),
    title: document.getElementById("appPopupTitle"),
    message: document.getElementById("appPopupMessage"),
    spinner: document.getElementById("appPopupSpinner"),
    ok: document.getElementById("appPopupOk")
  };
}

function appNotify(message, type = "info", sticky = false) {
  if (type !== "loading") {
    hideAppPopup(); // tắt loading overlay ngay khi API trả về
    const rht = window.nxtToast;
    if (rht) {
      const duration = sticky ? 5000 : 2200;
      const msg = String(message || "");
      if (type === "success") rht.success(msg, { duration });
      else if (type === "error") rht.error(msg, { duration });
      else rht(msg, { duration, icon: "ℹ️" });
      return;
    }
    // fallback nếu chưa có rht: hiện overlay đơn giản
    const { overlay, title, spinner, ok } = appPopupElements();
    if (!overlay) { console.log(message); return; }
    overlay.className = `app-popup-overlay show ${type}`;
    if (title) title.textContent = String(message || "");
    if (spinner) spinner.style.display = "none";
    if (ok) ok.style.display = "none";
    if (!sticky) {
      clearTimeout(appNotify._timer);
      appNotify._timer = setTimeout(() => hideAppPopup(), 2200);
    }
    return;
  }
  // Loading: full-screen overlay
  const { overlay, title, message: msgEl, spinner, ok } = appPopupElements();
  if (!overlay) { console.log(message); return; }
  overlay.className = `app-popup-overlay show loading`;
  if (title) title.textContent = "Đang xử lý dữ liệu...";
  if (msgEl) msgEl.textContent = String(message || "");
  if (spinner) spinner.style.display = "inline-block";
  if (ok) ok.style.display = "none";
}

function hideAppPopup() {
  const { overlay } = appPopupElements();
  if (overlay) overlay.classList.remove("show");
}

function nxtConfirm({ title, message, onConfirm, danger = true }) {
  let overlay = document.getElementById("nxtConfirmOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "nxtConfirmOverlay";
    document.body.appendChild(overlay);
  }
  const btnColor = danger ? "#dc2626" : "#065f2d";
  const btnShadow = danger ? "rgba(220,38,38,.25)" : "rgba(6,95,45,.25)";
  const iconColor = danger ? "#ea580c" : "#065f2d";
  const iconBg = danger ? "#fff7ed" : "#f0fdf4";
  const iconBorder = danger ? "#fed7aa" : "#bbf7d0";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.45);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;";
  overlay.innerHTML = `<div style="background:#fff;border-radius:24px;padding:32px 28px 24px;max-width:380px;width:90%;box-shadow:0 20px 40px rgba(0,0,0,.14);text-align:center;font-family:inherit;">
    <div style="width:60px;height:60px;border-radius:18px;background:${iconBg};border:1px solid ${iconBorder};display:flex;align-items:center;justify-content:center;margin:0 auto 18px;box-shadow:0 8px 20px -6px ${danger ? "rgba(234,88,12,.35)" : "rgba(6,95,45,.3)"};">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <p style="font-weight:800;font-size:16px;color:#1e293b;margin:0 0 10px;letter-spacing:-.2px;">${title}</p>
    <p style="font-size:13.5px;color:#64748b;margin:0 0 24px;line-height:1.65;">${message}</p>
    <div style="display:flex;gap:12px;">
      <button id="nxtConfirmCancel" style="flex:1;padding:12px;border-radius:14px;border:1px solid #e2e8f0;background:#fff;color:#64748b;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s;">Hủy bỏ</button>
      <button id="nxtConfirmOk" style="flex:1;padding:12px;border-radius:14px;border:none;background:${btnColor};color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px ${btnShadow};transition:all .15s;">Xác nhận</button>
    </div>
  </div>`;
  const close = () => { overlay.style.display = "none"; overlay.innerHTML = ""; };
  document.getElementById("nxtConfirmCancel").onclick = close;
  document.getElementById("nxtConfirmOk").onclick = () => { close(); onConfirm(); };
  overlay.onclick = e => { if (e.target === overlay) close(); };
}

function setupAppPopup() {
  const { overlay, ok } = appPopupElements();
  ok?.addEventListener("click", hideAppPopup);
  overlay?.addEventListener("click", event => {
    if (event.target === overlay && !overlay.classList.contains("loading")) hideAppPopup();
  });

  // Bỏ alert mặc định của trình duyệt để toàn bộ thông báo đi qua popup nội bộ.
  window.alert = function (message) { appNotify(message, "info"); };

  const loadingMap = {
    btnAddGiftInToSample: "Đang cập nhật Gói ra vào Tổng quan...",
    btnApplyStockToSample: "Đang cập nhật Tồn CN / Chuyển CN...",
    btnApplyCancelToSample: "Đang cập nhật Hủy giỏ...",
    btnApplySapoExcel: "Đang cập nhật Sapo vào Tổng quan...",
    btnUndoLastSapoUpload: "Đang xóa dữ liệu Sapo vừa nạp...",
    btnApplyWrongCode: "Đang áp dụng điều chỉnh sai mã / đổi mã...",
    btnApplyEditQty: "Đang áp dụng sửa số lượng...",
  };

  document.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button || !loadingMap[button.id]) return;
    appNotify(loadingMap[button.id], "loading", true);
    setTimeout(() => {
      const { overlay } = appPopupElements();
      if (overlay?.classList.contains("loading")) hideAppPopup();
    }, 8000);
  }, true);
}


function isAdminUser() {
  return currentUser?.role === "admin";
}

function userCanDeleteLogs() {
  return currentUser?.canDeleteLogs === true;
}

function userCanEditQty() {
  return currentUser?.canEditQty === true;
}

function roleLabel(role) {
  if (role === "admin") return "Admin/Trưởng ca";
  if (role === "employee") return "Nhân viên";
  return role || "Chưa rõ";
}

function getCurrentUserName() {
  return currentUser?.displayName || "Chưa đăng nhập";
}

function getLatestSapoDate() {
  const dates = dashboardRows
    .filter(row => !isInactiveRow(row) && (number(row.sapoSold) !== 0 || number(row.revenue) !== 0 || number(row.orderCount) !== 0))
    .map(row => row.closeDate)
    .filter(Boolean)
    .sort((a, b) => displayToIso(b).localeCompare(displayToIso(a)));
  return dates[0] || "Chưa nạp";
}

function syncPermissionUi() {
  const admin = isAdminUser();
  document.body.classList.toggle("employee-mode", !!currentUser && !admin);

  const applyBtn = document.getElementById("btnApplyWrongCode");
  if (applyBtn) applyBtn.textContent = admin ? "Áp dụng điều chỉnh" : "Gửi đề xuất sai mã";

  const clearBtn = document.getElementById("btnClearAdjustments");
  if (clearBtn) clearBtn.classList.toggle("app-hidden", !admin);

  const note = document.getElementById("wrongCodePermissionNote");
  if (note) {
    note.innerHTML = admin
      ? "<b>Admin/Trưởng ca:</b> được áp dụng điều chỉnh chính thức vào Dashboard. Mọi lần xử lý đều lưu log user thực hiện."
      : "<b>Nhân viên:</b> chỉ gửi đề xuất sai mã/đổi mã. Dashboard chưa đổi số cho đến khi Admin/Trưởng ca áp dụng.";
  }

  if (!admin && document.getElementById("screen-sapoImport")?.classList.contains("active")) {
    document.querySelector('.tab[data-tab="overview"]')?.click();
  }

  const canEQ = userCanEditQty();
  console.log("[NXT perm] canEditQty:", canEQ, "| currentUser.canEditQty:", currentUser?.canEditQty, "| role:", currentUser?.role);
  const editQtyTab = document.getElementById("tabEditQty");
  if (editQtyTab) {
    editQtyTab.classList.toggle("app-hidden", !canEQ);
    if (!canEQ && document.getElementById("screen-editQty")?.classList.contains("active")) {
      document.querySelector('.tab[data-tab="overview"]')?.click();
    }
  }
  const suraTh = document.getElementById("overviewSuraTh");
  if (suraTh) suraTh.style.display = canEQ ? "" : "none";
}

function setDefaultBranchForUser() {
  if (!currentUser || currentUser.branch === "ALL") return;
  const ids = [
    "overviewBranchFilter",
    "giftInBranch",
    "stockBranch",
    "cancelBranch",
    "transferFromBranch",
    "wrongCodeBranch",
    "editQtyBranch"
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const hasOption = [...el.options].some(opt => opt.value === currentUser.branch || opt.textContent === currentUser.branch);
    if (hasOption) el.value = currentUser.branch;
  });
}

function applyLoginState() {
  if (!currentUser) return;
  applyRoleTabs();
  syncPermissionUi();
  setDefaultBranchForUser();
}

function applyRoleTabs() {
  const role = currentUser?.role || "";
  document.querySelectorAll(".tab[data-tab]").forEach(button => {
    const roles = String(button.dataset.roles || "").split(",").map(x => x.trim()).filter(Boolean);
    if (roles.length && !roles.includes(role)) button.classList.add("role-hidden");
    else button.classList.remove("role-hidden");
  });
  document.querySelector(".tab[data-tab]:not(.role-hidden)")?.click();
}

function setupTabs() {
  const tabButtons = document.querySelectorAll(".tab[data-tab]");
  const screens = document.querySelectorAll(".screen");
  tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      tabButtons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
      screens.forEach(screen => screen.classList.remove("active"));
      document.getElementById("screen-" + button.dataset.tab)?.classList.add("active");
    });
  });
}

function getRowsByFilter() {
  const today = new Date().toISOString().split('T')[0];
  let rows = [...dashboardRows].filter(row => !isInactiveRow(row));
  const from = document.getElementById("dateFrom")?.value
  const to = document.getElementById("dateTo")?.value;
  const branch = document.getElementById("overviewBranchFilter")?.value || "Tất cả";
  const status = document.getElementById("overviewStatusFilter")?.value || "all";

  rows = rows.filter(row => isDateInRange(row.closeDate, from, to));
  if (branch !== "Tất cả") rows = rows.filter(row => row.branch === branch);
  if (status === "diff") rows = rows.filter(row => calcDiff(row) !== 0);
  if (status === "match") rows = rows.filter(row => calcDiff(row) === 0);
  if (status === "soldNotPicked") rows = rows.filter(row => number(row.soldNotPicked) > 0);
  return rows;
}

function isInactiveRow(row) {
  return shouldHideInactive(row);
}

function renderDashboardByPermission() {
  const rows = getRowsByFilter();
  renderDashboardRows(rows);
  updateKpis(rows);
  renderCheckDays();
}


function ensureTransferNotes(row) {
  if (!row.transferNotes) row.transferNotes = [];
  return row.transferNotes;
}

function addTransferNote({ closeDate, branch, itemCode, type, otherBranch, qty }) {
  const row = dashboardRows.find(r => r.closeDate === closeDate && r.branch === branch && r.itemCode === itemCode);
  if (!row) return;
  const notes = ensureTransferNotes(row);
  notes.push({ type, otherBranch, qty: number(qty) });
}

function renderRowLabels(row) {
  const labels = [];
  const notes = row.transferNotes || [];
  notes.forEach(note => {
    if (note.type === "out") labels.push(`<span class="transfer-badge out">Gửi ${note.otherBranch} · ${note.qty}</span>`);
    if (note.type === "in") labels.push(`<span class="transfer-badge in">Nhận từ ${note.otherBranch} · ${note.qty}</span>`);
  });

  const stockType = getStockStatusType(row);
  if (stockType === "DTT" && number(row.soldNotPicked) > 0) {
    labels.push(`<span class="stock-badge dtt">DTT · ${number(row.soldNotPicked)}</span>`);
  }
  if (stockType === "CTT" && number(row.actualStock) > 0) {
    labels.push(`<span class="stock-badge ctt">CTT · ${number(row.actualStock)}</span>`);
  }

  if (calcExpectedStock(row) < 0 && number(row.transferBranch) > 0) {
    labels.push(`<span class="stock-badge sourcewarn">Chuyển CN thiếu nguồn</span>`);
  }

  if (!labels.length) return '<span class="mini-note">—</span>';
  return `<div class="row-labels">${labels.join("")}</div>`;
}

function getStockStatusType(rowOrStatus) {
  const status = typeof rowOrStatus === "string" ? rowOrStatus : String(rowOrStatus?.stockStatus || "");
  const plain = removeAccent(status).toLowerCase();
  if (plain.includes("ctt") || plain.includes("chua thanh toan")) return "CTT";
  if (plain.includes("dtt") || plain.includes("da thanh toan") || plain.includes("cho lay") || plain.includes("chua lay") || plain.includes("cho giao") || plain.includes("da ban chua lay")) return "DTT";
  return "";
}

function renderActualStockCell(row) {
  return `${number(row.actualStock)}`;
}

function renderSoldNotPickedCell(row) {
  return `${number(row.soldNotPicked)}`;
}

function plainTransferNote(row) {
  const notes = row.transferNotes || [];
  return notes.map(note => {
    if (note.type === "out") return `Gửi ${note.otherBranch} · ${note.qty}`;
    if (note.type === "in") return `Nhận từ ${note.otherBranch} · ${note.qty}`;
    return "";
  }).filter(Boolean).join("; ");
}

function guessDiffReason(row) {
  const diff = calcDiff(row);
  if (diff === 0) return "";

  const code = String(row.itemCode || "").toUpperCase();
  const hints = [];
  const opening = number(row.openingStock);
  const giftIn = number(row.giftIn);
  const receive = number(row.receiveBranch);
  const transfer = number(row.transferBranch);
  const cancel = number(row.cancelBasket);
  const sapo = number(row.sapoSold);
  const actual = number(row.actualStock);
  const dtt = number(row.soldNotPicked);
  const hasTransferNote = (row.transferNotes || []).length > 0;

  if (/^(SON|TEMP|TMP)/.test(code)) hints.push("Mã tạm/SON: kiểm đổi mã");

  if (opening === 0 && sapo > 0 && giftIn === 0 && receive === 0) {
    hints.push("Có bán nhưng không có tồn đầu/gói ra: kiểm mã bán hoặc thiếu tồn đầu");
  }

  if (actual > 0 && opening === 0 && giftIn === 0 && receive === 0) {
    hints.push("Có tồn thực tế nhưng thiếu nguồn vào: kiểm tồn đầu/gói ra/nhận CN");
  }

  if (calcExpectedStock(row) < 0 && transfer > 0) {
    hints.push("Chuyển CN thiếu nguồn: kiểm tồn đầu/gói ra/nhận CN");
  } else if (hasTransferNote || transfer || receive) {
    hints.push("Có luân chuyển: đối chiếu gửi/nhận CN");
  }

  if (diff > 0 && !giftIn && !receive && opening === 0) {
    hints.push("Dư: hay thiếu Gói ra hoặc Nhận CN");
  }

  if (diff < 0 && !sapo && !cancel && !transfer) {
    hints.push("Thiếu: kiểm Sapo bán, Hủy giỏ hoặc Chuyển CN");
  }

  if (sapo > 0 && actual > 0 && !dtt) {
    hints.push("Bán rồi vẫn còn tại quầy: nếu đã thanh toán/chưa lấy thì gắn DTT");
  }

  if (!hints.length) hints.push(diff > 0 ? "Dư nhẹ: kiểm nguồn vào" : "Thiếu nhẹ: kiểm nguồn ra");
  return hints.slice(0, 2).join(" · ") + " — app chỉ nghi thôi 😄";
}


function getActiveInventoryFields() {
  return ["openingStock", "giftIn", "receiveBranch", "transferBranch", "cancelBasket", "sapoSold", "adjustment", "actualStock", "soldNotPicked"];
}

function hasActiveInventory(row) {
  return getActiveInventoryFields().some(field => number(row[field]) !== 0);
}

function shouldHideInactive(row) {
  if (!row) return true;
  if (row.inactive) return true;
  const allFields = ["openingStock", "giftIn", "receiveBranch", "transferBranch", "cancelBasket", "sapoSold", "adjustment", "actualStock", "soldNotPicked", "revenue", "orderCount"];
  return allFields.every(field => number(row[field]) === 0);
}

function maybeDeactivateRow(row) {
  if (!row) return;
  cleanupZeroFields(row);
  if (shouldHideInactive(row)) row.inactive = true;
}

const IE_INPUT_SX = 'type="number" style="width:58px;text-align:right;border:1px solid #bfdbfe;border-radius:6px;padding:2px 5px;font-size:12px;font-family:inherit;outline:none;background:#eff6ff;-moz-appearance:textfield;"';

function renderDashboardRows(rows) {
  const tbody = document.getElementById("dashboardRows");
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="18">Không có dữ liệu theo bộ lọc hiện tại.</td></tr>';
    updateKpis([]);
    return;
  }
  const canEQ = userCanEditQty();
  tbody.innerHTML = rows.map(row => {
    const expected = calcExpectedStock(row);
    const compare = calcCompareStock(row);
    const diff = calcDiff(row);
    const d = escapeHtml(row.closeDate), b = escapeHtml(row.branch), c = escapeHtml(row.itemCode);
    const rowKey = `${row.closeDate}||${row.branch}||${row.itemCode}`;
    const isEditing = overviewEditKey === rowKey;

    if (isEditing) {
      const dr = overviewEditDraft;
      return `<tr style="background:#f0f9ff;outline:2px solid #3b82f6;outline-offset:-1px;">
        <td>${row.closeDate}</td><td>${row.branch}</td><td><b>${row.itemCode}</b></td><td>${renderRowLabels(row)}</td>
        <td class="right">${number(row.openingStock)}</td>
        <td class="right"><input id="ie_giftIn" ${IE_INPUT_SX} value="${number(dr.giftIn)}"></td>
        <td class="right"><input id="ie_receiveBranch" ${IE_INPUT_SX} value="${number(dr.receiveBranch)}"></td>
        <td class="right"><input id="ie_transferBranch" ${IE_INPUT_SX} value="${number(dr.transferBranch)}"></td>
        <td class="right"><input id="ie_cancelBasket" ${IE_INPUT_SX} value="${number(dr.cancelBasket)}"></td>
        <td class="right">${number(row.sapoSold)}</td>
        <td class="right"><input id="ie_adjustment" ${IE_INPUT_SX} value="${number(dr.adjustment)}"></td>
        <td class="right"><input id="ie_actualStock" ${IE_INPUT_SX} value="${number(dr.actualStock)}"></td>
        <td class="right"><input id="ie_soldNotPicked" ${IE_INPUT_SX} value="${number(dr.soldNotPicked)}"></td>
        <td class="right">${compare}</td><td class="right">${expected}</td><td>${getDiffBadge(diff)}</td>
        <td>${escapeHtml(guessDiffReason(row))}</td>
        <td style="white-space:nowrap;">
          <button onclick="confirmInlineEdit()" style="background:#dcfce7;color:#166534;border:1px solid #bbf7d0;border-radius:6px;padding:2px 9px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;margin-right:3px;">Lưu</button>
          <button onclick="cancelInlineEdit()" style="background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:6px;padding:2px 7px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;">✕</button>
        </td>
      </tr>`;
    }

    const editBtn = canEQ
      ? `<button onclick="startInlineEdit('${d}','${b}','${c}')" style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;" title="Chỉnh sửa trực tiếp dòng này">Sửa</button>`
      : "";
    return `<tr>
      <td>${row.closeDate}</td><td>${row.branch}</td><td><b>${row.itemCode}</b></td><td>${renderRowLabels(row)}</td>
      <td class="right">${number(row.openingStock)}</td><td class="right">${number(row.giftIn)}</td><td class="right">${number(row.receiveBranch)}</td>
      <td class="right">${number(row.transferBranch)}</td><td class="right">${number(row.cancelBasket)}</td><td class="right">${number(row.sapoSold)}</td>
      <td class="right">${number(row.adjustment)}</td><td class="right">${renderActualStockCell(row)}</td><td class="right">${renderSoldNotPickedCell(row)}</td>
      <td class="right">${compare}</td><td class="right">${expected}</td><td>${getDiffBadge(diff)}</td><td>${escapeHtml(guessDiffReason(row))}</td>
      <td>${editBtn}</td>
    </tr>`;
  }).join("");
}

function startInlineEdit(closeDate, branch, itemCode) {
  if (overviewEditKey) cancelInlineEdit();
  const row = findDashboardRow(closeDate, branch, itemCode);
  if (!row) return;
  overviewEditKey = `${closeDate}||${branch}||${itemCode}`;
  overviewEditDraft = { ...row };
  renderDashboardByPermission();
}

function cancelInlineEdit() {
  overviewEditKey = null;
  overviewEditDraft = {};
  renderDashboardByPermission();
}

function readInlineEditDraft() {
  ["giftIn", "receiveBranch", "transferBranch", "cancelBasket", "adjustment", "actualStock", "soldNotPicked"].forEach(f => {
    const el = document.getElementById(`ie_${f}`);
    if (el) overviewEditDraft[f] = number(el.value);
  });
}

function confirmInlineEdit() {
  readInlineEditDraft();
  const dr = overviewEditDraft;
  const compareNew = number(dr.actualStock) - number(dr.soldNotPicked);
  const expectedNew = number(dr.openingStock) + number(dr.giftIn) + number(dr.receiveBranch)
    - number(dr.transferBranch) - number(dr.sapoSold) - number(dr.cancelBasket) + number(dr.adjustment);
  const diffNew = compareNew - expectedNew;
  const diffLabel = diffNew === 0 ? `<span style="color:#16a34a;font-weight:700;">✓ Khớp</span>` : `<span style="color:#dc2626;font-weight:700;">${diffNew > 0 ? "+" : ""}${diffNew}</span>`;

  nxtConfirm({
    title: "Xác nhận lưu chỉnh sửa?",
    message: `<span style="font-size:12px;color:#94a3b8;">${escapeHtml(currentUser?.loginCode || "")} — ${escapeHtml(currentUser?.displayName || "")}</span><br><br>Mã <b>${escapeHtml(dr.itemCode)}</b> · ${escapeHtml(dr.branch)} · ${escapeHtml(dr.closeDate)}<br>Tồn so sánh mới: <b>${compareNew}</b> &nbsp;·&nbsp; Lệch mới: ${diffLabel}`,
    danger: false,
    onConfirm: async () => {
      const row = findDashboardRow(dr.closeDate, dr.branch, dr.itemCode);
      if (row) {
        row.giftIn = number(dr.giftIn);
        row.receiveBranch = number(dr.receiveBranch);
        row.transferBranch = number(dr.transferBranch);
        row.cancelBasket = number(dr.cancelBasket);
        row.adjustment = number(dr.adjustment);
        row.actualStock = number(dr.actualStock);
        row.soldNotPicked = number(dr.soldNotPicked);
        cleanupZeroFields(row);
      }
      overviewEditKey = null;
      overviewEditDraft = {};
      const saveRes = await fetch(`${NXT_API}/rows/inline`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      if (!saveRes.ok) {
        const msg = await saveRes.text().catch(() => "");
        appNotify("Lưu thất bại: " + (msg || saveRes.status), "error");
        return;
      }
      renderDashboardByPermission();
      appNotify("Đã lưu chỉnh sửa thành công.", "success");
    }
  });
}

function updateKpis(rows) {
  const totals = rows.reduce((sum, row) => {
    sum.openingStock += number(row.openingStock); sum.giftIn += number(row.giftIn); sum.receiveBranch += number(row.receiveBranch);
    sum.transferBranch += number(row.transferBranch); sum.cancelBasket += number(row.cancelBasket); sum.sapoSold += number(row.sapoSold);
    sum.actualStock += number(row.actualStock); sum.soldNotPicked += number(row.soldNotPicked); sum.revenue += number(row.revenue);
    sum.orderCount += number(row.orderCount); if (calcDiff(row) !== 0) sum.diffRows += 1;
    return sum;
  }, { openingStock: 0, giftIn: 0, receiveBranch: 0, transferBranch: 0, cancelBasket: 0, sapoSold: 0, actualStock: 0, soldNotPicked: 0, revenue: 0, orderCount: 0, diffRows: 0 });
  setText("kpiOpeningStock", totals.openingStock); setText("kpiGiftIn", totals.giftIn); setText("kpiReceiveBranch", totals.receiveBranch);
  setText("kpiTransferBranch", totals.transferBranch); setText("kpiCancelBasket", totals.cancelBasket); setText("kpiSapoSold", totals.sapoSold);
  setText("kpiActualStock", totals.actualStock); setText("kpiSoldNotPicked", totals.soldNotPicked); setText("kpiDiffRows", totals.diffRows);
  setText("kpiOrderCount", totals.orderCount);
  setText("kpiSapoUpdated", getLatestSapoDate());
  setText("kpiRevenue", formatCompactMoney(totals.revenue));
}

function getCheckDayKey(date, branch) { return `${date}__${branch}`; }

function buildCheckDays() {
  const map = {};
  dashboardRows.forEach(row => {
    if (isInactiveRow(row)) return;
    const diff = calcDiff(row);
    if (diff === 0) return;
    const key = getCheckDayKey(row.closeDate, row.branch);
    if (!map[key]) {
      map[key] = { date: row.closeDate, branch: row.branch, diffRows: 0, totalDiff: 0, absDiff: 0, codes: [] };
    }
    map[key].diffRows += 1;
    map[key].totalDiff += diff;
    map[key].absDiff += Math.abs(diff);
    map[key].codes.push({ code: row.itemCode, diff });
  });
  return Object.values(map).sort((a, b) => displayToIso(b.date).localeCompare(displayToIso(a.date)) || b.absDiff - a.absDiff);
}

function renderCheckDays() {
  const box = document.getElementById("checkDaysRows");
  if (!box) return;

  const rows = buildCheckDays();
  const branches = ["Phú Lợi", "Ngô Quyền", "Lái Thiêu"];

  const branchRows = branches.reduce((map, branch) => {
    map[branch] = rows.filter(row => row.branch === branch)
      .sort((a, b) => displayToIso(b.date).localeCompare(displayToIso(a.date)) || b.absDiff - a.absDiff);
    return map;
  }, {});

  box.innerHTML = `<div class="check-day-board">
    ${branches.map(branch => {
    const list = branchRows[branch] || [];
    const totalCodes = list.reduce((sum, row) => sum + row.diffRows, 0);
    const totalAbs = list.reduce((sum, row) => sum + row.absDiff, 0);
    const headerNote = list.length
      ? `${list.length} ngày · ${totalCodes} mã · ABS ${totalAbs}`
      : "Không có ngày bị lệch";

    const body = list.length ? list.map(row => {
      const topCodes = row.codes
        .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
        .slice(0, 3)
        .map(x => `${x.code}(${x.diff > 0 ? "+" : ""}${x.diff})`)
        .join(", ");
      const tone = row.totalDiff > 0 ? "Dư" : "Thiếu";
      const totalText = `${tone} ${row.totalDiff > 0 ? "+" : ""}${row.totalDiff}`;
      return `<button class="check-day-item" type="button" data-date="${escapeHtml(row.date)}" data-branch="${escapeHtml(row.branch)}">
          <span class="check-date">${escapeHtml(row.date)}</span>
          <span class="check-stat">${row.diffRows} mã · ${totalText} · Mức cần kiểm ${row.absDiff}</span>
          <span class="check-codes">${escapeHtml(topCodes)}</span>
        </button>`;
    }).join("") : `<div class="check-day-empty">Không có ngày bị lệch.</div>`;

    return `<div class="check-branch-card">
        <div class="check-branch-head">
          <b>${branch}</b>
          <span>${headerNote}</span>
        </div>
        <div class="check-branch-list">${body}</div>
      </div>`;
  }).join("")}
  </div>`;

  box.querySelectorAll(".check-day-item[data-date]").forEach(item => {
    item.addEventListener("click", () => {
      const date = item.dataset.date;
      const branch = item.dataset.branch;
      document.getElementById("dateFrom").value = displayToIso(date);
      document.getElementById("dateTo").value = displayToIso(date);
      document.getElementById("overviewBranchFilter").value = branch;
      document.getElementById("overviewStatusFilter").value = "diff";
      renderDashboardByPermission();
      document.getElementById("screen-overview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[ch]));
}

function isHeaderLine(clean) {
  const noAccent = removeAccent(clean).toLowerCase();
  if (/^(tong|total)\b/.test(noAccent)) return true;
  if (/^ngay\s+\d{1,2}[\/-]\d{1,2}/.test(noAccent)) return true;
  if (/^(pl|phu loi|nq|ngo quyen|lt|lai thieu)\s+\d{1,2}[\/-]\d{1,2}/.test(noAccent)) return true;
  if (/^(pl|phu loi|nq|ngo quyen|lt|lai thieu)$/.test(noAccent)) return true;
  return false;
}

function looksLikePriceOrDate(token) {
  const t = String(token || "").trim().toUpperCase();
  if (/^\d{1,2}[\/-]\d{1,2}/.test(t)) return true;
  if (/^\d+([.,]\d+)?K$/.test(t)) return true;
  if (/^\d{1,3}([.,]\d{3})+$/.test(t)) return true;
  return false;
}

function parseQtyFromRest(rest) {
  const s = String(rest || "").trim();
  if (!s) return 1;

  // Ưu tiên số lượng ngay sau mã: H1135 2, H1135 x2, H1135: 2, H1135 1+1
  const directPlus = s.match(/^\s*(?:[:：\-–—]|x|X|sl|SL|số lượng|so luong)?\s*(-?\d+(?:\s*\+\s*-?\d+)+)\b/i);
  if (directPlus) return directPlus[1].split("+").reduce((sum, value) => sum + number(value.trim()), 0);

  const directQty = s.match(/^\s*(?:[:：\-–—]|x|X|sl|SL|số lượng|so luong)?\s*(-?\d+(?:[.,]\d+)?)\b/i);
  if (directQty && !looksLikePriceOrDate(directQty[1])) return number(directQty[1].replace(",", "."));

  // Dạng Zalo hay gặp: H1135 dtt 2, H1135 ctt 1, H1135 chờ giao 2
  const laterPlus = s.match(/\b(-?\d+(?:\s*\+\s*-?\d+)+)\b/);
  if (laterPlus) return laterPlus[1].split("+").reduce((sum, value) => sum + number(value.trim()), 0);

  const laterQty = s.match(/\b(?:sl|so luong|số lượng|qty)?\s*(-?\d+(?:[.,]\d+)?)\b/i);
  if (laterQty && !looksLikePriceOrDate(laterQty[1])) return number(laterQty[1].replace(",", "."));

  return 1;
}

function isSoldNotPickedStatus(status) {
  // Chỉ DTT/đã bán/chưa lấy mới vào cột Đã bán/chưa lấy.
  // CTT vẫn nằm trong Tồn thực tế, chỉ gắn nhãn CTT để nhân viên kiểm tra.
  return getStockStatusType(String(status || "")) === "DTT";
}

function parseTransferToBranch(raw, defaultBranch) {
  const s = removeAccent(raw).toUpperCase();
  const after = s.match(/CHUYEN\s+(PL|NQ|LT|PHU LOI|NGO QUYEN|LAI THIEU)/);
  if (!after) return defaultBranch || "";
  return normBranch(after[1]);
}

function inferStockStatus(raw, defaultStatus) {
  const s = removeAccent(raw).toLowerCase();
  const hasToken = token => new RegExp(`(^|\\s|[^a-z0-9])${token}($|\\s|[^a-z0-9])`, "i").test(s);

  if (/chuyen\s+(pl|nq|lt|phu loi|ngo quyen|lai thieu)/.test(s)) return "Chuyển chi nhánh";
  if (hasToken("ctt") || /chua thanh toan/.test(s)) return "CTT - giữ giỏ/chưa thanh toán";
  if (hasToken("dtt") || /da thanh toan|cho lay|chua lay|cho giao|da ban chua lay|khach da thanh toan/.test(s)) {
    return "DTT - đã bán chưa lấy";
  }
  return defaultStatus || "Tồn bình thường";
}

function parseCodeQtyText(text, defaults = {}) {
  const lines = String(text || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const rows = [];
  lines.forEach(line => {
    const clean = line.replace(/[，,;]/g, " ").trim();
    if (isHeaderLine(clean)) return;
    const codeMatch = clean.match(/\b(SON[A-Za-z0-9-]*|TEMP[A-Za-z0-9-]*|TMP[A-Za-z0-9-]*|[A-Za-z]{1,3}\d+[A-Za-z0-9-]*)\b/i);
    if (!codeMatch) return;
    const itemCode = codeMatch[1].toUpperCase();
    if (!VALID_CODE_PREFIX.test(itemCode)) return;
    if (looksLikePriceOrDate(itemCode)) return;
    const rest = clean.slice(codeMatch.index + codeMatch[0].length).trim();
    const qty = parseQtyFromRest(rest);
    if (!itemCode || !qty) return;
    rows.push({ ...defaults, itemCode, qty, raw: line });
  });
  return rows;
}

function upsertDashboardRow({ closeDate, branch, itemCode, patch }) {
  let row = dashboardRows.find(r => r.closeDate === closeDate && r.branch === branch && r.itemCode === itemCode);
  if (!row) {
    row = { closeDate, branch, itemCode, openingStock: 0, giftIn: 0, receiveBranch: 0, transferBranch: 0, cancelBasket: 0, sapoSold: 0, adjustment: 0, actualStock: 0, soldNotPicked: 0, revenue: 0, orderCount: 0, transferNotes: [] };
    dashboardRows.push(row);
  }
  Object.keys(patch).forEach(key => { row[key] = number(row[key]) + number(patch[key]); });
  if (Object.keys(patch).some(key => number(patch[key]) !== 0)) row.inactive = false;
  cleanupZeroFields(row);
  // dbSaveRow bỏ ở đây — mọi operation đều gọi dbSyncBatch() ở cuối, tránh concurrent INSERT conflict
}

function setDashboardStock({ closeDate, branch, itemCode, actualStock, soldNotPicked, stockStatus }) {
  upsertDashboardRow({ closeDate, branch, itemCode, patch: {} });
  const row = dashboardRows.find(r => r.closeDate === closeDate && r.branch === branch && r.itemCode === itemCode);
  row.actualStock = number(actualStock);
  row.soldNotPicked = number(soldNotPicked);
  row.stockStatus = stockStatus || "Tồn bình thường";
  // Row có thể đang inactive từ session cũ — phải kích hoạt lại khi ghi tồn thực tế
  row.inactive = false;
  // dbSaveRow bỏ ở đây — dbSyncBatch() ở cuối operation sẽ save toàn bộ

  // Nguyên tắc vận hành: tồn đầu ngày sau lấy theo Tồn thực tế cuối ngày trước.
  // DTT dùng để trừ khi so lệch trong ngày; CTT chỉ gắn nhãn trong tồn thực tế. Tồn đầu ngày sau lấy theo tồn thực tế.
  setNextDayOpeningFromActual({
    closeDate,
    branch,
    itemCode,
    actualStock: row.actualStock
  });
}

function renderPreview(tbodyId, rows, columns, emptyText) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  if (!rows.length) { tbody.innerHTML = `<tr><td colspan="${columns.length}">${emptyText}</td></tr>`; return; }
  tbody.innerHTML = rows.map((row, idx) => "<tr>" + columns.map(col => `<td${col.right ? ' class="right"' : ""}>${col.render ? col.render(row, idx) : (row[col.key] ?? "")}</td>`).join("") + "</tr>").join("");
}

function setupOverview() {
  ["dateFrom", "dateTo", "overviewBranchFilter", "overviewStatusFilter"].forEach(id => document.getElementById(id)?.addEventListener("change", renderDashboardByPermission));
  document.getElementById("btnRefreshOverview")?.addEventListener("click", renderDashboardByPermission);
  document.getElementById("btnExportCsv")?.addEventListener("click", exportCurrentExcel);
  document.querySelectorAll(".btnOpenOcr").forEach(btn => btn.addEventListener("click", openOcrHelper));
}

function openOcrHelper() {
  appNotify("Đang mở công cụ Chuyển ảnh thành text ở tab mới. Sau khi OCR xong, copy kết quả dán lại vào ô cần nhập.", "info", true);
  if (OCR_HELPER_URL) window.open(OCR_HELPER_URL, "_blank", "noopener,noreferrer");
}

function getExportRows() {
  return getRowsByFilter().map(row => ({
    "Ngày chốt": row.closeDate,
    "CN": row.branch,
    "Mã": row.itemCode,
    "Luân chuyển": plainTransferNote(row),
    "Tồn đầu": number(row.openingStock),
    "Gói ra": number(row.giftIn),
    "Nhận CN": number(row.receiveBranch),
    "Chuyển CN": number(row.transferBranch),
    "Hủy": number(row.cancelBasket),
    "Sapo bán": number(row.sapoSold),
    "Điều chỉnh": number(row.adjustment),
    "Tồn thực tế": number(row.actualStock),
    "DTT/đã bán chưa lấy": number(row.soldNotPicked),
    "Nhãn tồn": row.stockStatus || "",
    "Tồn so sánh": calcCompareStock(row),
    "Tồn còn lại theo app": calcExpectedStock(row),
    "Lệch": calcDiff(row),
    "Gợi ý kiểm tra": guessDiffReason(row)
  }));
}

function exportCurrentExcel() {
  const rows = getExportRows();
  if (!rows.length) { appNotify("Không có dữ liệu để xuất.", "error"); return; }
  if (typeof XLSX !== "undefined") {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tong quan");
    XLSX.writeFile(wb, "phf-nxt-tong-quan.xlsx");
    return;
  }
  exportCurrentCsvFallback(rows);
}

function exportCurrentCsvFallback(rows) {
  const headers = Object.keys(rows[0] || {});
  const csvRows = [headers.join(",")];
  rows.forEach(row => csvRows.push(headers.map(h => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",")));
  const blob = new Blob(["\ufeff" + csvRows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "phf-nxt-tong-quan.csv"; a.click();
  URL.revokeObjectURL(url);
}


function makeOpLog(type, rows, detail) {
  const dates = [...new Set(rows.map(r => r.date ? isoToDisplay(r.date) : (r.closeDate || "")))].join(", ").slice(0, 40);
  const branches = [...new Set(rows.map(r => r.branch || r.fromBranch || ""))].join("/");
  const qty = rows.reduce((s, r) => s + Math.abs(number(r.qty ?? r.sapoSold ?? 0)), 0);
  return {
    createdAt: new Date().toLocaleString("vi-VN"),
    closeDate: dates, branch: branches, type,
    source: "", wrongCode: "", rightCode: "",
    qty, note: `${rows.length} dòng`, user: getCurrentUserName(), status: "Đã áp dụng",
    detail: detail || rows.map(r => {
      const cd = r.date ? isoToDisplay(r.date) : (r.closeDate || "");
      const qty = r.qty ?? r.sapoSold ?? 0;
      return cd ? `${cd}|${r.itemCode}:${qty}` : `${r.itemCode}:${qty}`;
    }).join(", ")
  };
}

function setupGiftIn() {
  const previewBtn = document.getElementById("btnPreviewGiftIn");
  previewBtn?.addEventListener("click", () => {
    lastGiftInPreview = parseCodeQtyText(document.getElementById("giftInText").value, { date: document.getElementById("giftInDate").value, branch: document.getElementById("giftInBranch").value, codeType: document.getElementById("giftInCodeType").value });
    renderPreview("giftInPreviewRows", lastGiftInPreview, [{ key: "date" }, { key: "branch" }, { key: "itemCode", render: r => `<b>${r.itemCode}</b>` }, { key: "qty", right: true }, { key: "codeType" }, { key: "raw" }], "Chưa đọc được dòng hợp lệ.");
  });
  document.getElementById("btnAddGiftInToSample")?.addEventListener("click", async () => {
    if (!lastGiftInPreview.length) previewBtn?.click();
    lastGiftInPreview.forEach(r => upsertDashboardRow({ closeDate: isoToDisplay(r.date), branch: r.branch, itemCode: r.itemCode, patch: { giftIn: r.qty } }));
    renderDashboardByPermission();
    const log = makeOpLog("Nạp Gói ra", lastGiftInPreview);
    adjustmentsLog.unshift(log);
    await Promise.all([dbSyncBatch(), dbSaveLog(log)]);
    renderAdjustments();
    appNotify("Đã cộng Gói ra vào Tổng quan.", "success");
  });
  document.getElementById("btnClearGiftIn")?.addEventListener("click", () => { document.getElementById("giftInText").value = ""; lastGiftInPreview = []; renderPreview("giftInPreviewRows", [], [{}, {}, {}, {}, {}, {}], "Chưa có dữ liệu."); });
}

function setupStock() {
  const previewBtn = document.getElementById("btnPreviewStock");
  previewBtn?.addEventListener("click", () => {
    lastStockPreview = parseCodeQtyText(document.getElementById("stockText").value, { date: document.getElementById("stockDate").value, branch: document.getElementById("stockBranch").value }).map(row => ({ ...row, status: inferStockStatus(row.raw, document.getElementById("stockDefaultStatus").value), transferToBranch: parseTransferToBranch(row.raw, "") }));
    renderPreview("stockPreviewRows", lastStockPreview, [{ key: "date" }, { key: "branch" }, { key: "itemCode", render: r => `<b>${r.itemCode}</b>` }, { key: "qty", right: true }, { key: "status" }, { key: "transferToBranch" }, { key: "raw" }], "Chưa đọc được dòng tồn hợp lệ.");
  });
  document.getElementById("btnApplyStockToSample")?.addEventListener("click", async () => {
    if (!lastStockPreview.length) previewBtn?.click();
    lastStockPreview.forEach(r => {
      if (r.status === "Chuyển chi nhánh" && r.transferToBranch) {
        applyTransferRow({ date: r.date, fromBranch: r.branch, toBranch: r.transferToBranch, itemCode: r.itemCode, qty: r.qty });
      } else {
        const soldNotPicked = isSoldNotPickedStatus(r.status) ? r.qty : 0;
        setDashboardStock({ closeDate: isoToDisplay(r.date), branch: r.branch, itemCode: r.itemCode, actualStock: r.qty, soldNotPicked, stockStatus: r.status });
      }
    });
    renderDashboardByPermission();
    const logStock = makeOpLog("Nạp Tồn CN", lastStockPreview);
    adjustmentsLog.unshift(logStock);
    await Promise.all([dbSyncBatch(), dbSaveLog(logStock)]);
    renderAdjustments();
    appNotify("Đã cập nhật Tồn CN / Chuyển CN vào Tổng quan.", "success");
  });
  document.getElementById("btnClearStock")?.addEventListener("click", () => { document.getElementById("stockText").value = ""; lastStockPreview = []; renderPreview("stockPreviewRows", [], [{}, {}, {}, {}, {}, {}, {}], "Chưa có dữ liệu."); });
}

function setupCancel() {
  const previewBtn = document.getElementById("btnPreviewCancel");
  previewBtn?.addEventListener("click", () => {
    lastCancelPreview = parseCodeQtyText(document.getElementById("cancelText").value, { date: document.getElementById("cancelDate").value, branch: document.getElementById("cancelBranch").value, reason: document.getElementById("cancelReason").value });
    renderPreview("cancelPreviewRows", lastCancelPreview, [{ key: "date" }, { key: "branch" }, { key: "itemCode", render: r => `<b>${r.itemCode}</b>` }, { key: "qty", right: true }, { key: "reason" }, { key: "raw" }], "Chưa đọc được dòng hủy hợp lệ.");
  });
  document.getElementById("btnApplyCancelToSample")?.addEventListener("click", async () => {
    if (!lastCancelPreview.length) previewBtn?.click();
    lastCancelPreview.forEach(r => upsertDashboardRow({ closeDate: isoToDisplay(r.date), branch: r.branch, itemCode: r.itemCode, patch: { cancelBasket: r.qty } }));
    renderDashboardByPermission();
    const logCancel = makeOpLog("Nạp Hủy giỏ", lastCancelPreview);
    adjustmentsLog.unshift(logCancel);
    await Promise.all([dbSyncBatch(), dbSaveLog(logCancel)]);
    renderAdjustments();
    appNotify("Đã cập nhật Hủy giỏ vào Tổng quan.", "success");
  });
}

function applyTransferRow(r) {
  const closeDate = isoToDisplay(r.date);
  const fromBranch = r.fromBranch;
  const toBranch = r.toBranch;
  const itemCode = r.itemCode;
  const qty = number(r.qty);

  upsertDashboardRow({ closeDate, branch: fromBranch, itemCode, patch: { transferBranch: qty } });
  addTransferNote({ closeDate, branch: fromBranch, itemCode, type: "out", otherBranch: toBranch, qty });
  const fromRow = dashboardRows.find(r => r.closeDate === closeDate && r.branch === fromBranch && r.itemCode === itemCode);
  if (fromRow) dbSaveRow(fromRow);

  upsertDashboardRow({ closeDate, branch: toBranch, itemCode, patch: { receiveBranch: qty } });
  addTransferNote({ closeDate, branch: toBranch, itemCode, type: "in", otherBranch: fromBranch, qty });
  const toRow = dashboardRows.find(r => r.closeDate === closeDate && r.branch === toBranch && r.itemCode === itemCode);
  if (toRow) dbSaveRow(toRow);
}

function setupTransfer() {
  const previewBtn = document.getElementById("btnPreviewTransfer");
  previewBtn?.addEventListener("click", () => {
    const defaultTo = document.getElementById("transferToBranch").value;
    lastTransferPreview = parseCodeQtyText(document.getElementById("transferText").value, { date: document.getElementById("transferDate").value, fromBranch: document.getElementById("transferFromBranch").value }).map(r => ({ ...r, toBranch: parseTransferToBranch(r.raw, defaultTo) }));
    renderPreview("transferPreviewRows", lastTransferPreview, [{ key: "date" }, { key: "fromBranch" }, { key: "toBranch" }, { key: "itemCode", render: r => `<b>${r.itemCode}</b>` }, { key: "qty", right: true }, { key: "raw" }], "Chưa đọc được dòng chuyển hợp lệ.");
  });
  document.getElementById("btnApplyTransferToSample")?.addEventListener("click", async () => {
    if (!lastTransferPreview.length) previewBtn?.click();
    lastTransferPreview.forEach(applyTransferRow);
    renderDashboardByPermission();
    const logTrf = makeOpLog("Nạp Chuyển CN", lastTransferPreview, lastTransferPreview.map(r => `${r.itemCode}:${r.qty} ${r.fromBranch}→${r.toBranch}`).join(", "));
    adjustmentsLog.unshift(logTrf);
    await Promise.all([dbSyncBatch(), dbSaveLog(logTrf)]);
    renderAdjustments();
    appNotify("Đã cập nhật Chuyển CN vào Tổng quan.", "success");
  });
}

function setupSapo() {
  document.getElementById("btnReadSapoExcel")?.addEventListener("click", readSapoExcel);
  document.getElementById("btnDownloadSapoTemplate")?.addEventListener("click", downloadSapoTemplate);
  document.getElementById("btnApplySapoExcel")?.addEventListener("click", async () => {
    if (!lastSapoPreview.length) { appNotify("Chưa có dữ liệu Sapo đọc được.", "error"); return; }
    const result = applySapoRowsLatest(lastSapoPreview);
    if (!result.changed && result.same > 0) {
      appNotify(`File Sapo không có thay đổi so với dữ liệu đang có (${result.same} dòng). App giữ số cũ, không cộng thêm lần nữa.`, "info", true);
      return;
    }
    const logSapo = makeOpLog("Nạp Sapo", lastSapoPreview);
    adjustmentsLog.unshift(logSapo);
    await Promise.all([result.syncPromise, dbSaveLog(logSapo)]);
    renderAdjustments();
    appNotify(`Đã cập nhật Sapo theo file mới nhất. ${result.changed} dòng thay đổi, ${result.same} dòng giữ nguyên. Nếu nạp nhầm, có thể bấm Xóa dữ liệu Sapo vừa nạp.`, "success", true);
  });
  document.getElementById("btnUndoLastSapoUpload")?.addEventListener("click", undoLastSapoUpload);
}

function getSapoKey(row) {
  return `${row.closeDate}__${row.branch}__${row.itemCode}`;
}

function getSapoRowsSignature(rows) {
  return JSON.stringify(aggregateSapoRows(rows).map(r => [r.closeDate, r.branch, r.itemCode, number(r.sapoSold), number(r.orderCount), number(r.revenue)]));
}

function aggregateSapoRows(rows) {
  const map = {};
  (rows || []).forEach(r => {
    const key = getSapoKey(r);
    if (!map[key]) map[key] = { ...r, sapoSold: 0, orderCount: 0, revenue: 0 };
    map[key].sapoSold += number(r.sapoSold);
    map[key].orderCount += number(r.orderCount);
    map[key].revenue += number(r.revenue);
  });
  return Object.values(map).sort((a, b) => displayToIso(a.closeDate).localeCompare(displayToIso(b.closeDate)) || a.branch.localeCompare(b.branch) || a.itemCode.localeCompare(b.itemCode));
}

function setSapoExact(row, values) {
  row.sapoSold = number(values.sapoSold);
  row.orderCount = number(values.orderCount);
  row.revenue = number(values.revenue);
  cleanupZeroFields(row);
  maybeDeactivateRow(row);
}

function findOrCreateDashboardRowForSapo(r) {
  let row = dashboardRows.find(x => x.closeDate === r.closeDate && x.branch === r.branch && x.itemCode === r.itemCode);
  if (!row) {
    row = { closeDate: r.closeDate, branch: r.branch, itemCode: r.itemCode, openingStock: 0, giftIn: 0, receiveBranch: 0, transferBranch: 0, cancelBasket: 0, sapoSold: 0, adjustment: 0, actualStock: 0, soldNotPicked: 0, revenue: 0, orderCount: 0, transferNotes: [] };
    dashboardRows.push(row);
  }
  return row;
}

function applySapoRowsLatest(rows) {
  const aggregated = aggregateSapoRows(rows);
  const signature = getSapoRowsSignature(aggregated);
  const undoRows = [];
  let changed = 0;
  let same = 0;

  aggregated.forEach(r => {
    const row = findOrCreateDashboardRowForSapo(r);
    const oldValues = { sapoSold: number(row.sapoSold), orderCount: number(row.orderCount), revenue: number(row.revenue) };
    const newValues = { sapoSold: number(r.sapoSold), orderCount: number(r.orderCount), revenue: number(r.revenue) };
    const isSame = oldValues.sapoSold === newValues.sapoSold && oldValues.orderCount === newValues.orderCount && oldValues.revenue === newValues.revenue;
    if (isSame) { same += 1; return; }
    undoRows.push({ closeDate: r.closeDate, branch: r.branch, itemCode: r.itemCode, ...oldValues });
    setSapoExact(row, newValues);
    row.inactive = false;
    changed += 1;
  });

  dashboardRows.forEach(maybeDeactivateRow);
  const syncPromise = changed > 0 ? dbSyncBatch() : Promise.resolve();
  renderDashboardByPermission();
  if (changed > 0) {
    lastAppliedSapoRows = undoRows;
    lastAppliedSapoSignature = signature;
  }
  return { changed, same, total: aggregated.length, syncPromise };
}

function undoLastSapoUpload() {
  if (!lastAppliedSapoRows.length) {
    appNotify("Chưa có lượt Sapo vừa nạp để xóa/hoàn tác.", "error");
    return;
  }
  lastAppliedSapoRows.forEach(r => {
    const row = findOrCreateDashboardRowForSapo(r);
    setSapoExact(row, r);
  });
  dashboardRows.forEach(maybeDeactivateRow);
  dbSyncBatch();
  renderDashboardByPermission();
  const count = lastAppliedSapoRows.length;
  lastAppliedSapoRows = [];
  lastAppliedSapoSignature = "";
  appNotify(`Đã hoàn tác lượt cập nhật Sapo gần nhất (${count} dòng).`, "success", true);
}

function renderSapoRows(rows) {
  renderPreview("sapoPreviewRows", rows, [{ key: "closeDate" }, { key: "branch" }, { key: "itemCode", render: r => `<b>${r.itemCode}</b>` }, { key: "sapoSold", right: true }, { key: "orderCount", right: true }, { key: "revenue", right: true, render: r => formatMoney(r.revenue) }, { key: "note" }], "Chưa nạp Sapo.");
}

async function readSapoExcel() {
  if (typeof XLSX === "undefined") { appNotify("Chưa tải được thư viện đọc Excel SheetJS. Kiểm tra internet hoặc để IT đóng gói thư viện nội bộ.", "error", true); return; }
  const file = document.getElementById("sapoFileInput")?.files?.[0];
  if (!file) { appNotify("Vui lòng chọn file Excel Sapo trước nhé.", "error"); return; }
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  lastSapoPreview = parseSapoMatrix(matrix);
  renderSapoRows(lastSapoPreview);
}

function downloadSapoTemplate() {
  if (typeof XLSX === "undefined") { appNotify("Chưa tải được SheetJS để tạo file mẫu.", "error"); return; }
  const headers = [
    "Ngày", "Loại sản phẩm", "Mã SKU", "Tên phiên bản",
    "Trạng thái xuất kho", "Trạng thái thanh toán", "Trạng thái đơn hàng",
    "Tên chi nhánh", "SL hàng bán ra", "SL hàng thực bán", "SL đơn hàng",
    "Doanh thu", "Doanh thu thuần"
  ];
  const today = (() => { const d = new Date(); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; })();
  const rows = [
    headers,
    [today, "Giỏ quà", "H1144", "Giỏ quà Phú Lợi 650k", "Đã giao", "Đã thanh toán", "Hoàn thành", "Phú Lợi", 1, 1, 1, 650000, 650000],
    [today, "Giỏ quà", "H1129", "Giỏ quà Ngô Quyền 780k", "Đã giao", "Đã thanh toán", "Hoàn thành", "Ngô Quyền", 1, 1, 1, 780000, 780000],
    [today, "Giỏ quà", "H1133", "Giỏ quà Lái Thiêu 590k", "Chưa giao", "Đã thanh toán", "Đã hủy", "Lái Thiêu", 1, 1, 1, 590000, 590000],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = headers.map((h, i) => ({ wch: [10, 14, 10, 28, 18, 20, 22, 16, 14, 16, 12, 12, 14][i] || 14 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Mẫu Sapo");
  XLSX.writeFile(wb, "mau-sapo-nxt.xlsx");
  appNotify("Đã tải file mẫu. Dòng 'Đã hủy' sẽ bị lọc tự động khi nạp, không cần xóa tay.", "info", true);
}

function findHeaderRow(matrix) {
  for (let i = 0; i < Math.min(matrix.length, 20); i++) {
    const rowText = matrix[i].map(x => removeAccent(x).toLowerCase()).join("|");
    if ((rowText.includes("ma sku") || rowText.includes("sku")) && (rowText.includes("ten phien ban") || rowText.includes("san pham") || rowText.includes("ma hang"))) return i;
  }
  return 0;
}

function parseSapoMatrix(matrix) {
  if (!matrix || !matrix.length) return [];
  const headerRow = findHeaderRow(matrix);
  const headers = matrix[headerRow].map(h => removeAccent(String(h || "").trim()).toLowerCase());
  const idx = names => {
    for (const name of names) {
      const cleanName = removeAccent(name).toLowerCase();
      const found = headers.findIndex(h => h === cleanName || h.includes(cleanName));
      if (found >= 0) return found;
    }
    return -1;
  };
  const dateIdx = idx(["ngay", "thoi gian", "created", "ngay tao"]);
  const branchIdx = idx(["chi nhanh", "cua hang", "kho", "nguon ban"]);
  const skuIdx = idx(["ma sku", "sku", "ma hang"]);
  const nameIdx = idx(["ten phien ban", "ten san pham", "san pham", "variant"]);
  const qtyIdx = idx(["sl hang thuc ban", "so luong", "sl ban", "net sold qty"]);
  const orderIdx = idx(["sl don hang", "so don", "don hang"]);
  const revenueIdx = idx(["doanh thu", "doanh thu thuan", "tien hang"]);
  const statusIdx = idx(["trang thai don", "trang thai"]);
  const out = [];

  matrix.slice(headerRow + 1).forEach((row, i) => {
    const rawSku = String(row[skuIdx] || "").trim();
    const rawName = String(row[nameIdx] || "").trim();
    const joined = `${rawSku} ${rawName}`;
    if (!rawSku && !rawName) return;
    if (/tong|total/i.test(removeAccent(joined))) return;
    const itemCode = extractGiftCode(joined);
    if (!itemCode) return;
    const sapoSold = number(row[qtyIdx]);
    const revenue = number(row[revenueIdx]);
    const orderCount = orderIdx >= 0 ? number(row[orderIdx]) : (sapoSold ? 1 : 0);
    if (sapoSold === 0 && revenue === 0) return;
    const status = String(row[statusIdx] || "");
    if (/huy|cancel/i.test(removeAccent(status))) return;
    out.push({
      closeDate: parseExcelDate(row[dateIdx]) || document.getElementById("dateFrom")?.value && isoToDisplay(document.getElementById("dateFrom").value) || "15/06/2026",
      branch: normBranch(row[branchIdx]) || "Phú Lợi",
      itemCode,
      sapoSold,
      orderCount,
      revenue,
      note: `Excel dòng ${i + headerRow + 2}`
    });
  });
  return out;
}

function parseExcelDate(value) {
  if (!value) return "";
  if (typeof value === "number" && typeof XLSX !== "undefined") {
    const d = XLSX.SSF.parse_date_code(value);
    if (d) return `${String(d.d).padStart(2, "0")}/${String(d.m).padStart(2, "0")}/${d.y}`;
  }
  const s = String(value).trim();
  const m = s.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (m) return `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3].length === 2 ? "20" + m[3] : m[3]}`;
  const iso = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[3].padStart(2, "0")}/${iso[2].padStart(2, "0")}/${iso[1]}`;
  return "";
}

function extractGiftCode(text) {
  const matches = String(text || "").toUpperCase().match(/\b(SON[A-Z0-9-]*|TEMP[A-Z0-9-]*|TMP[A-Z0-9-]*|H\d+[A-Z0-9-]*|GT\d+[A-Z0-9-]*|BK\d+[A-Z0-9-]*|AT\d+[A-Z0-9-]*)\b/g);
  if (!matches) return "";
  return matches.find(m => VALID_CODE_PREFIX.test(m) && !looksLikePriceOrDate(m)) || "";
}



function getInventoryFieldsForRow() {
  return ["openingStock", "giftIn", "receiveBranch", "transferBranch", "cancelBasket", "sapoSold", "adjustment", "actualStock", "soldNotPicked"];
}

function hasInventoryEffect(row) {
  return getInventoryFieldsForRow().some(field => number(row[field]) !== 0);
}

function isSapoOnlyRow(row) {
  return number(row.sapoSold) !== 0 || number(row.revenue) !== 0 || number(row.orderCount) !== 0;
}

function markRowInactiveIfNoInventory(row) {
  if (!row) return;
  if (!hasInventoryEffect(row)) row.inactive = true;
}

function checkTempCodeBranch() {
  const closeDate = isoToDisplay(document.getElementById("wrongCodeDate").value);
  const branch = document.getElementById("wrongCodeBranch").value;
  const wrongCode = document.getElementById("wrongCodeInput").value.trim().toUpperCase();
  const source = document.getElementById("tempCodeSource")?.value || "allInternal";
  const type = document.getElementById("wrongCodeType")?.value || "";
  const box = document.getElementById("tempCodeCheckResult");

  if (!box) return;

  if (!closeDate || !branch || !wrongCode) {
    box.className = "placeholder-box warnbox";
    box.innerHTML = "Vui lòng nhập ngày phát sinh, chi nhánh và mã sai/mã tạm trước rồi bấm kiểm tra.";
    return;
  }

  const allCodeRows = dashboardRows.filter(row =>
    !isInactiveRow(row)
    && row.closeDate === closeDate
    && row.itemCode === wrongCode
  );

  const sameBranchRowsAll = allCodeRows.filter(row => row.branch === branch);
  const otherBranchRowsAll = allCodeRows.filter(row => row.branch !== branch);
  const branches = [...new Set(allCodeRows.map(row => row.branch))];

  if (type === "Sai mã Sapo / check đơn") {
    const sapoRows = allCodeRows.filter(row => number(row.sapoSold) !== 0 || number(row.revenue) !== 0);
    const sameSapo = sapoRows.filter(row => row.branch === branch);
    const otherSapo = sapoRows.filter(row => row.branch !== branch);

    if (sameSapo.length === 1 && otherSapo.length === 0) {
      box.className = "placeholder-box";
      box.innerHTML = `<b>OK:</b> Mã <b>${wrongCode}</b> có phát sinh Sapo ở đúng chi nhánh <b>${branch}</b>. Có thể áp dụng Sai mã Sapo.`;
      return;
    }

    if (sameSapo.length === 0 && otherSapo.length > 0) {
      box.className = "placeholder-box warnbox";
      box.innerHTML = `<b>CẢNH BÁO MẠNH:</b> Mã <b>${wrongCode}</b> có Sapo nhưng không nằm ở <b>${branch}</b>, đang thấy ở: <b>${[...new Set(otherSapo.map(r => r.branch))].join(", ")}</b>.`;
      return;
    }

    if (sameSapo.length > 1 || (sameSapo.length > 0 && otherSapo.length > 0)) {
      box.className = "placeholder-box warnbox";
      box.innerHTML = `<b>Cần kiểm tra:</b> Mã <b>${wrongCode}</b> có nhiều phát sinh Sapo/nghi vấn nhiều chi nhánh. Vui lòng xác nhận ngày và CN trước khi đổi.`;
      return;
    }

    box.className = "placeholder-box warnbox";
    box.innerHTML = `<b>Chưa thấy Sapo:</b> Không tìm thấy mã <b>${wrongCode}</b> trong Sapo ngày <b>${closeDate}</b>. Nếu mã nằm ở Gói ra/Tồn/Hủy/Chuyển thì chọn loại <b>Đổi mã tạm / nhập nhầm</b>.`;
    return;
  }

  // Đổi mã tạm / nhập nhầm: chỉ kiểm tra phát sinh nội bộ.
  const internalRows = allCodeRows.filter(row => hasInternalSource(row, source));
  const sameBranchRows = internalRows.filter(row => row.branch === branch);
  const otherBranchRows = internalRows.filter(row => row.branch !== branch);

  if (sameBranchRows.length === 1 && otherBranchRows.length === 0) {
    box.className = "placeholder-box";
    box.innerHTML = `<b>OK:</b> Mã <b>${wrongCode}</b> đang có 1 phát sinh nội bộ ở đúng chi nhánh <b>${branch}</b>. Có thể đổi mã.`;
    return;
  }

  if (sameBranchRows.length > 1) {
    box.className = "placeholder-box warnbox";
    box.innerHTML = `<b>Cần kiểm tra:</b> Mã <b>${wrongCode}</b> có nhiều phát sinh nội bộ trong chi nhánh <b>${branch}</b>. Vui lòng xem kỹ nguồn phát sinh trước khi đổi.`;
    return;
  }

  if (sameBranchRows.length === 0 && otherBranchRows.length > 0) {
    box.className = "placeholder-box warnbox";
    box.innerHTML = `<b>CẢNH BÁO MẠNH:</b> Mã <b>${wrongCode}</b> không nằm ở chi nhánh <b>${branch}</b>, mà đang thấy ở: <b>${[...new Set(otherBranchRows.map(row => row.branch))].join(", ")}</b>. Có thể bạn chọn sai chi nhánh hoặc sai ngày.`;
    return;
  }

  const sameSapoOnly = sameBranchRowsAll.filter(row => isSapoOnlyRow(row));
  if (sameBranchRows.length === 0 && sameSapoOnly.length > 0) {
    box.className = "placeholder-box warnbox";
    box.innerHTML = `<b>Đang thấy ở Sapo bán:</b> Mã <b>${wrongCode}</b> có trong Sapo của <b>${branch}</b>. Nếu cần đổi mã bán sai, hãy chọn loại <b>Sai mã Sapo / check đơn</b>, không chọn Đổi mã tạm.`;
    return;
  }

  box.className = "placeholder-box warnbox";
  box.innerHTML = `<b>Chưa thấy phát sinh:</b> Không tìm thấy mã <b>${wrongCode}</b> trong ngày <b>${closeDate}</b>, nguồn <b>${formatSourceName(source)}</b>. Kiểm tra lại ngày, chi nhánh hoặc nguồn phát sinh.`;
}

function hasInternalSource(row, source) {
  return getInternalMoveFields(source).some(field => number(row[field]) !== 0);
}

function setupWrongCode() {
  const typeEl = document.getElementById("wrongCodeType");
  const sourceEl = document.getElementById("tempCodeSource");
  const syncSourceVisibility = () => {
    if (!sourceEl || !typeEl) return;
    sourceEl.disabled = typeEl.value === "Sai mã Sapo / check đơn";
  };
  typeEl?.addEventListener("change", syncSourceVisibility);
  syncSourceVisibility();
  syncPermissionUi();

  document.getElementById("btnCheckTempCode")?.addEventListener("click", checkTempCodeBranch);
  document.getElementById("btnApplyWrongCode")?.addEventListener("click", applyWrongCode);
  document.getElementById("btnClearAdjustments")?.addEventListener("click", () => { if (!isAdminUser()) return; adjustmentsLog = []; dbClearLogs(); renderAdjustments(); });
}

async function applyWrongCode() {
  const closeDate = isoToDisplay(document.getElementById("wrongCodeDate").value);
  const branch = document.getElementById("wrongCodeBranch").value;
  const type = document.getElementById("wrongCodeType").value;
  const source = document.getElementById("tempCodeSource")?.value || "allInternal";
  const wrongCode = normalizeItemCode(document.getElementById("wrongCodeInput").value);
  const rightCode = normalizeItemCode(document.getElementById("rightCodeInput").value);
  const qty = Math.abs(number(document.getElementById("wrongCodeQty").value));
  const note = document.getElementById("wrongCodeNote").value.trim();

  if (!closeDate || !branch || !wrongCode || !rightCode || !qty) {
    appNotify("Vui lòng nhập đủ ngày phát sinh, chi nhánh, mã sai, mã đúng, số lượng.", "error");
    return;
  }

  if (wrongCode === rightCode) {
    appNotify("Mã sai/mã tạm và mã đúng đang giống nhau. Vui lòng kiểm tra lại mã.", "error");
    return;
  }

  if (!isAdminUser()) {
    const entry1 = {
      createdAt: new Date().toLocaleString("vi-VN"),
      closeDate,
      branch,
      type: "Đề xuất - " + type,
      source: type === "Đổi mã tạm / nhập nhầm" ? source : "",
      wrongCode,
      rightCode,
      qty,
      note,
      user: getCurrentUserName(),
      status: "Chờ Admin/Trưởng ca xử lý",
      detail: "Nhân viên gửi đề xuất, chưa áp dụng số liệu vào Dashboard."
    };
    adjustmentsLog.push(entry1);
    dbSaveLog(entry1);
    renderAdjustments();
    appNotify("Đã ghi nhận đề xuất sai mã/đổi mã. Dashboard chưa thay đổi cho đến khi Admin/Trưởng ca áp dụng.", "success", true);
    return;
  }

  let result;
  if (type === "Sai mã Sapo / check đơn") {
    result = moveSapoWrongCode({ closeDate, branch, wrongCode, rightCode, qty });
  } else {
    result = moveTempCodeOccurrences({ closeDate, branch, wrongCode, rightCode, qty, source });
  }

  if (!result.moved) {
    appNotify(result.message || "Chưa tìm thấy phát sinh phù hợp để chuyển. App chưa đổi số trên Dashboard.", "error", true);
    return;
  }

  const entry2 = {
    createdAt: new Date().toLocaleString("vi-VN"),
    closeDate,
    branch,
    type,
    source: type === "Đổi mã tạm / nhập nhầm" ? source : "",
    wrongCode,
    rightCode,
    qty,
    note,
    user: getCurrentUserName(),
    status: "Đã áp dụng",
    detail: result.detail || ""
  };
  adjustmentsLog.push(entry2);
  dbSaveLog(entry2);

  renderAdjustments();
  renderDashboardByPermission();

  const msg = type === "Sai mã Sapo / check đơn"
    ? "Đã chuyển Sapo bán từ mã sai sang mã đúng trong Tổng quan."
    : "Đã chuyển phát sinh nội bộ từ mã cũ sang mã đúng trong Tổng quan.";
  await dbSyncBatch();
  appNotify(msg + "\nMã cũ sẽ tự ẩn nếu đã hết phát sinh có ý nghĩa.", "success", true);
}

function normalizeItemCode(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

function findDashboardRow(closeDate, branch, itemCode) {
  return dashboardRows.find(r => r.closeDate === closeDate && r.branch === branch && r.itemCode === itemCode);
}

function isZeroish(value) {
  return Math.abs(number(value)) < 0.000001;
}

function cleanupZeroFields(row) {
  if (!row) return;
  ["openingStock", "giftIn", "receiveBranch", "transferBranch", "cancelBasket", "sapoSold", "adjustment", "actualStock", "soldNotPicked", "revenue", "orderCount"].forEach(field => {
    if (isZeroish(row[field])) row[field] = 0;
  });
}

function deactivateIfEmpty(row) {
  cleanupZeroFields(row);
  maybeDeactivateRow(row);
}

function moveNumericFieldByQty(fromRow, toRow, field, qtyLimit) {
  const current = number(fromRow[field]);
  if (!current) return 0;

  const limit = qtyLimit > 0 ? qtyLimit : Math.abs(current);
  const moveAbs = Math.min(Math.abs(current), limit);
  if (moveAbs <= 0) return 0;

  const moveValue = moveAbs * Math.sign(current);
  fromRow[field] = number(fromRow[field]) - moveValue;
  toRow[field] = number(toRow[field]) + moveValue;
  cleanupZeroFields(fromRow);
  cleanupZeroFields(toRow);
  return moveValue;
}

function moveTempCodeOccurrences({ closeDate, branch, wrongCode, rightCode, qty, source }) {
  const wrong = findDashboardRow(closeDate, branch, wrongCode);

  if (!wrong || isInactiveRow(wrong)) {
    return { moved: false, message: `Không thấy mã ${wrongCode} ở ${branch} ngày ${closeDate}. Kiểm tra lại ngày/chi nhánh/mã.` };
  }

  if (number(wrong.sapoSold) !== 0 || number(wrong.revenue) !== 0 || number(wrong.orderCount) !== 0) {
    return {
      moved: false,
      message: `Mã ${wrongCode} đang có dữ liệu Sapo/doanh thu/số đơn. Nếu là bán sai mã, hãy chọn “Sai mã Sapo / check đơn”, không chọn “Đổi mã tạm”.`
    };
  }

  upsertDashboardRow({ closeDate, branch, itemCode: rightCode, patch: {} });
  const right = findDashboardRow(closeDate, branch, rightCode);
  if (right) right.inactive = false;

  const sourceFields = getInternalMoveFields(source);
  const movedFields = [];
  let movedActualStockAbs = 0;

  sourceFields.forEach(field => {
    // Với đổi mã tạm, SL được hiểu là SL cần đổi cho TỪNG nguồn phát sinh.
    // Không dùng "remain" chung, vì cùng 1 mã có thể vừa Gói ra 1 vừa Tồn thực tế 1.
    const moved = moveNumericFieldByQty(wrong, right, field, qty);
    if (moved) {
      movedFields.push(`${field}:${moved}`);
      if (field === "actualStock") movedActualStockAbs += Math.abs(number(moved));
    }
  });

  if (!movedFields.length) {
    return {
      moved: false,
      message: `Mã ${wrongCode} có dòng nhưng không có phát sinh thuộc nguồn “${formatSourceName(source)}” để chuyển.`
    };
  }

  let nextOpeningSyncDetail = "";
  if ((source === "stock" || source === "allInternal") && movedActualStockAbs > 0) {
    const syncResult = syncNextDayOpeningAfterCodeChange(closeDate, branch, wrongCode, rightCode, movedActualStockAbs);
    if (syncResult.detail) nextOpeningSyncDetail = syncResult.detail;
    if (syncResult.synced) movedFields.push(`nextOpeningStock:${syncResult.qty}`);
  }

  if ((source === "transfer" || source === "allInternal") && wrong.transferNotes?.length) {
    right.transferNotes = [...(right.transferNotes || []), ...wrong.transferNotes];
    wrong.transferNotes = [];
  }

  deactivateIfEmpty(wrong);
  dbSaveRow(wrong);
  if (right) dbSaveRow(right);
  return { moved: true, detail: [movedFields.join(", "), nextOpeningSyncDetail].filter(Boolean).join(" | ") };
}

function moveSapoWrongCode({ closeDate, branch, wrongCode, rightCode, qty }) {
  const wrong = findDashboardRow(closeDate, branch, wrongCode);

  if (!wrong || isInactiveRow(wrong)) {
    return { moved: false, message: `Không thấy mã Sapo ${wrongCode} ở ${branch} ngày ${closeDate}. Kiểm tra lại ngày/chi nhánh/mã.` };
  }

  const oldSold = number(wrong.sapoSold);
  if (!oldSold) {
    return { moved: false, message: `Mã ${wrongCode} không có Sapo bán trong ngày/chi nhánh đã chọn. Nếu là mã tạm nội bộ, hãy chọn “Đổi mã tạm / nhập nhầm”.` };
  }

  upsertDashboardRow({ closeDate, branch, itemCode: rightCode, patch: {} });
  const right = findDashboardRow(closeDate, branch, rightCode);
  if (right) right.inactive = false;

  const moveAbs = Math.min(Math.abs(oldSold), qty);
  const moveSold = moveAbs * Math.sign(oldSold);
  const share = Math.abs(oldSold) > 0 ? moveAbs / Math.abs(oldSold) : 0;

  const moveRevenue = number(wrong.revenue) * share;
  const moveOrderCount = number(wrong.orderCount) * share;

  wrong.sapoSold = number(wrong.sapoSold) - moveSold;
  right.sapoSold = number(right.sapoSold) + moveSold;

  wrong.revenue = number(wrong.revenue) - moveRevenue;
  right.revenue = number(right.revenue) + moveRevenue;

  wrong.orderCount = number(wrong.orderCount) - moveOrderCount;
  right.orderCount = number(right.orderCount) + moveOrderCount;

  cleanupZeroFields(wrong);
  cleanupZeroFields(right);
  deactivateIfEmpty(wrong);
  dbSaveRow(wrong);
  if (right) dbSaveRow(right);

  return {
    moved: true,
    detail: `sapoSold:${moveSold}, revenue:${moveRevenue}, orderCount:${moveOrderCount}`
  };
}

function getInternalMoveFields(source) {
  // Đổi mã tạm / nhập nhầm chỉ chuyển phát sinh nội bộ.
  // Tuyệt đối không chuyển Sapo bán, doanh thu, số đơn.
  if (source === "giftIn") return ["giftIn"];
  if (source === "stock") return ["actualStock", "soldNotPicked"];
  if (source === "cancel") return ["cancelBasket"];
  if (source === "transfer") return ["transferBranch", "receiveBranch"];

  return [
    "openingStock",
    "giftIn",
    "actualStock",
    "soldNotPicked",
    "cancelBasket",
    "transferBranch",
    "receiveBranch",
    "adjustment"
  ];
}

function renderAdjustments() {
  const canDelete = userCanDeleteLogs();
  const ROLLBACK_TYPES = ["Nạp Gói ra", "Nạp Hủy giỏ", "Nạp Sapo", "Nạp Tồn CN", "Sửa SL"];
  const cols = [
    { key: "_view", render: (r, idx) => `<button onclick="showLogDetail(${idx})" style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;" title="Xem chi tiết nhập liệu">Xem</button>` },
    { key: "createdAt", render: r => r.createdAt || "" },
    { key: "closeDate" },
    { key: "branch" },
    { key: "type", render: r => r.source ? `${r.type}<br><span class="muted">Nguồn: ${formatSourceName(r.source)}</span>` : r.type },
    { key: "wrongCode", render: r => `<b>${r.wrongCode}</b>` },
    { key: "rightCode", render: r => `<b>${r.rightCode}</b>` },
    { key: "qty", right: true },
    { key: "user", render: r => r.user || "" },
    { key: "status", render: r => r.status || "" },
    { key: "note" }
  ];
  if (canDelete) {
    cols.push({ key: "_action", render: (r, idx) => ROLLBACK_TYPES.includes(r.type) ? `<button onclick="rollbackLog(${idx})" style="background:#fee2e2;color:#dc2626;border:1px solid #fecaca;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;" title="Hoàn tác và xóa thao tác này">Hoàn tác</button>` : "" });
  }
  const thEl = document.getElementById("adjustmentThaoTacTh");
  if (thEl) thEl.style.display = canDelete ? "" : "none";
  renderPreview("adjustmentRows", adjustmentsLog, cols, "Chưa có điều chỉnh/đề xuất.");
}

function parseLogDetail(detail) {
  return (detail || "").split(",").map(s => s.trim()).filter(Boolean).map(s => {
    // New format (v2): "DD/MM/YYYY|CODE:QTY"
    const v2 = s.match(/^(\d{2}\/\d{2}\/\d{4})\|(.+):(-?[\d.]+)$/);
    if (v2) return { closeDate: v2[1], code: v2[2].trim(), qty: Number(v2[3]) };
    // Old format (v1): "CODE:QTY"
    const v1 = s.match(/^(.+):(-?[\d.]+)$/);
    return v1 ? { code: v1[1].trim(), qty: Number(v1[2]), closeDate: null } : null;
  }).filter(Boolean);
}

function showLogDetail(idx) {
  const log = adjustmentsLog[idx];
  if (!log) return;

  const items = parseLogDetail(log.detail || "");
  let bodyHtml = "";

  if (log.type === "Sửa SL") {
    bodyHtml = `<div style="padding:12px 16px;background:#f8fafc;border-radius:10px;font-size:13.5px;color:#334155;">${escapeHtml(log.detail || "Không có chi tiết")}</div>`;
  } else if (log.type === "Đổi mã" || log.type === "Đề xuất đổi mã") {
    bodyHtml = `<div style="padding:12px 16px;background:#f8fafc;border-radius:10px;font-size:13.5px;color:#334155;">
      Mã sai: <b>${escapeHtml(log.wrongCode || "")}</b> → Mã đúng: <b>${escapeHtml(log.rightCode || "")}</b>
      ${log.detail ? `<br><span style="color:#64748b;font-size:12px;">${escapeHtml(log.detail)}</span>` : ""}
    </div>`;
  } else if (items.length > 0) {
    const totalQty = items.reduce((s, i) => s + Math.abs(i.qty), 0);
    const rowsHtml = items.map(item => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;">${escapeHtml(item.closeDate || log.closeDate)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-weight:700;">${escapeHtml(item.code)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;text-align:right;">${item.qty}</td>
      </tr>`).join("");
    bodyHtml = `
      <div style="max-height:300px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:10px;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="background:#f8fafc;">
            <th style="padding:8px 10px;text-align:left;font-weight:600;color:#64748b;border-bottom:1px solid #e2e8f0;">Ngày</th>
            <th style="padding:8px 10px;text-align:left;font-weight:600;color:#64748b;border-bottom:1px solid #e2e8f0;">Mã</th>
            <th style="padding:8px 10px;text-align:right;font-weight:600;color:#64748b;border-bottom:1px solid #e2e8f0;">SL</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
      <div style="margin-top:6px;font-size:12px;color:#94a3b8;text-align:right;">${items.length} mã · Tổng SL: <b>${totalQty}</b></div>`;
  } else if (log.detail) {
    bodyHtml = `<div style="padding:12px 16px;background:#f8fafc;border-radius:10px;font-size:13.5px;color:#334155;word-break:break-all;">${escapeHtml(log.detail)}</div>`;
  } else {
    bodyHtml = `<div style="color:#94a3b8;font-size:13px;padding:10px 0;">Không có chi tiết nhập liệu.</div>`;
  }

  let overlay = document.getElementById("nxtDetailOverlay");
  if (!overlay) { overlay = document.createElement("div"); overlay.id = "nxtDetailOverlay"; document.body.appendChild(overlay); }
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.45);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;";
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:20px;padding:26px 22px 20px;max-width:480px;width:92%;box-shadow:0 20px 40px rgba(0,0,0,.14);font-family:inherit;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;">
        <div>
          <div style="font-weight:800;font-size:15px;color:#1e293b;">${escapeHtml(log.type)}</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:3px;">${escapeHtml(log.createdAt || "")} · <b>${escapeHtml(log.branch)}</b> · ${escapeHtml(log.user || "")}</div>
        </div>
        <button id="nxtDetailClose" style="background:none;border:none;cursor:pointer;font-size:22px;color:#94a3b8;line-height:1;padding:0 2px;">×</button>
      </div>
      <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;">Chi tiết nhập liệu</div>
      ${bodyHtml}
      ${log.note ? `<div style="margin-top:10px;font-size:12px;color:#64748b;">Ghi chú: ${escapeHtml(log.note)}</div>` : ""}
    </div>`;
  const close = () => { overlay.style.display = "none"; overlay.innerHTML = ""; };
  document.getElementById("nxtDetailClose").onclick = close;
  overlay.onclick = e => { if (e.target === overlay) close(); };
}

async function rollbackLog(idx) {
  const log = adjustmentsLog[idx];
  if (!log) return;

  const SUPPORTED = ["Nạp Gói ra", "Nạp Hủy giỏ", "Nạp Sapo", "Nạp Tồn CN", "Sửa SL"];
  if (!SUPPORTED.includes(log.type)) {
    appNotify("Loại thao tác này không hỗ trợ hoàn tác.", "error");
    return;
  }

  const logUserLine = log.user ? `<span style="font-size:12px;color:#94a3b8;">Thao tác của: <b>${escapeHtml(log.user)}</b></span><br>` : "";
  const myLine = `<span style="font-size:12px;color:#94a3b8;">Người hoàn tác: <b>${escapeHtml(currentUser?.loginCode || "")}</b> — ${escapeHtml(currentUser?.displayName || "")}</span>`;

  nxtConfirm({
    title: "Xác nhận hoàn tác?",
    message: `${logUserLine}${myLine}<br><br>Sẽ hoàn tác và <b>XÓA</b> thao tác <b>${escapeHtml(log.type)}</b><br>Ngày <b>${escapeHtml(log.closeDate)}</b> · <b>${escapeHtml(log.branch)}</b><br><br>Hành động này <b>KHÔNG thể phục hồi</b>.`,
    onConfirm: async () => {
      try {
        const branches = log.branch.split("/").map(b => b.trim()).filter(Boolean);
        const items = parseLogDetail(log.detail);
        // fallbackDates dùng cho log cũ (v1) không có date trong detail
        const fallbackDates = log.closeDate.split(",").map(d => d.trim()).filter(Boolean);
        const getCDs = (item) => (item.closeDate ? [item.closeDate] : fallbackDates);

        if (log.type === "Nạp Gói ra") {
          items.forEach(item =>
            branches.forEach(br =>
              getCDs(item).forEach(cd => {
                const row = findDashboardRow(cd, br, item.code);
                if (row) { row.giftIn = number(row.giftIn) - item.qty; cleanupZeroFields(row); }
              })
            )
          );
        } else if (log.type === "Nạp Hủy giỏ") {
          items.forEach(item =>
            branches.forEach(br =>
              getCDs(item).forEach(cd => {
                const row = findDashboardRow(cd, br, item.code);
                if (row) { row.cancelBasket = number(row.cancelBasket) - item.qty; cleanupZeroFields(row); }
              })
            )
          );
        } else if (log.type === "Nạp Sapo") {
          items.forEach(item =>
            branches.forEach(br =>
              getCDs(item).forEach(cd => {
                const row = findDashboardRow(cd, br, item.code);
                if (row) { row.sapoSold = number(row.sapoSold) - item.qty; cleanupZeroFields(row); }
              })
            )
          );
        } else if (log.type === "Nạp Tồn CN") {
          items.forEach(item =>
            branches.forEach(br =>
              getCDs(item).forEach(cd => {
                const row = findDashboardRow(cd, br, item.code);
                if (row) { row.actualStock = 0; row.soldNotPicked = 0; row.stockStatus = ""; }
              })
            )
          );
        } else if (log.type === "Sửa SL") {
          const m = (log.detail || "").match(/^(.+):\s*([-\d.]+)\s*→\s*([-\d.]+)/);
          if (m && log.rightCode) {
            const labelToField = { "Gói ra": "giftIn", "Nhận CN": "receiveBranch", "Chuyển CN": "transferBranch", "Hủy giỏ": "cancelBasket", "Tồn thực tế": "actualStock", "Bán chưa lấy": "soldNotPicked", "Điều chỉnh": "adjustment", "Sapo bán": "sapoSold" };
            const fieldKey = labelToField[m[1].trim()];
            const oldVal = Number(m[2]);
            if (fieldKey) {
              branches.forEach(br => {
                const row = findDashboardRow(log.closeDate, br, log.rightCode);
                if (row) row[fieldKey] = oldVal;
              });
            }
          }
        }

        // Giai đoạn 1: lưu dữ liệu đã đảo ngược — nếu fail thì dừng toàn bộ
        const batchRes = await fetch(`${NXT_API}/rows/batch`, {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify(dashboardRows.map(rowToDto))
        });
        if (!batchRes.ok) {
          const errText = await batchRes.text().catch(() => "");
          throw new Error(`Lưu dữ liệu thất bại (${batchRes.status}). ${errText}`);
        }

        // Giai đoạn 2: xóa log — fail thì vẫn cập nhật UI nhưng báo lỗi riêng
        let logDeleteError = null;
        if (log.id) {
          const delRes = await fetch(`${NXT_API}/logs/${log.id}`, { method: "DELETE", credentials: "include" });
          if (!delRes.ok) {
            logDeleteError = delRes.status === 403
              ? "Bạn không có quyền xóa log (cần sales.nxt.delete_logs)."
              : `Xóa log thất bại (${delRes.status}).`;
          }
        }

        adjustmentsLog.splice(idx, 1);
        renderDashboardByPermission();
        renderAdjustments();

        if (logDeleteError) {
          appNotify(`Dữ liệu đã hoàn tác, nhưng: ${logDeleteError}`, "error", true);
        } else {
          appNotify("Đã hoàn tác và xóa thao tác thành công.", "success");
        }
      } catch (e) {
        appNotify("Lỗi khi hoàn tác: " + (e.message || e), "error");
      }
    }
  });
}


function formatSourceName(source) {
  const map = {
    allInternal: "Tất cả phát sinh nội bộ",
    giftIn: "Gói ra",
    stock: "Tồn CN",
    cancel: "Hủy giỏ",
    transfer: "Chuyển CN / Nhận CN"
  };
  return map[source] || source || "";
}

// ─── SỬA SL (TAB) ────────────────────────────────────────────────────────────

const EDIT_FIELD_LABELS = {
  giftIn: "Gói ra",
  receiveBranch: "Nhận CN",
  transferBranch: "Chuyển CN",
  cancelBasket: "Hủy giỏ",
  actualStock: "Tồn thực tế",
  soldNotPicked: "Bán chưa lấy"
};

function lookupEditQtyValue() {
  const closeDate = isoToDisplay(document.getElementById("editQtyDate").value);
  const branch = document.getElementById("editQtyBranch").value;
  const itemCode = normalizeItemCode(document.getElementById("editQtyCode").value);
  const field = document.getElementById("editQtyField").value;
  const resultBox = document.getElementById("editQtyCheckResult");
  const curValEl = document.getElementById("editQtyCurrentVal");

  const setResult = (msg, ok) => {
    resultBox.style.cssText = ok
      ? "background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:10px 14px;font-size:13px;color:#166534;"
      : "background:#fee2e2;border:1px solid #fecaca;border-radius:12px;padding:10px 14px;font-size:13px;color:#dc2626;";
    resultBox.innerHTML = msg;
  };

  if (!closeDate || !branch || !itemCode) {
    if (curValEl) curValEl.textContent = "—";
    setResult("Nhập ngày, chi nhánh và mã giỏ để xem giá trị hiện tại.", false);
    return;
  }

  const row = findDashboardRow(closeDate, branch, itemCode);

  if (!row) {
    if (curValEl) curValEl.textContent = "—";
    setResult(`Không tìm thấy mã <b>${itemCode}</b> tại <b>${branch}</b> ngày <b>${closeDate}</b>. Kiểm tra lại ngày/chi nhánh/mã.`, false);
    return;
  }

  const currentVal = number(row[field]);
  if (curValEl) curValEl.textContent = String(currentVal);
  document.getElementById("editQtyNewVal").value = String(currentVal);
  setResult(`Tìm thấy — ${EDIT_FIELD_LABELS[field]}: <b>${currentVal}</b> (${itemCode} · ${branch} · ${closeDate})`, true);
}

function syncEditQtyCounterBox() {
  const field = document.getElementById("editQtyField")?.value;
  const box = document.getElementById("editQtyCounterBox");
  if (box) box.style.display = (field === "transferBranch" || field === "receiveBranch") ? "block" : "none";
}

async function applyEditQty() {
  const closeDate = isoToDisplay(document.getElementById("editQtyDate").value);
  const branch = document.getElementById("editQtyBranch").value;
  const itemCode = normalizeItemCode(document.getElementById("editQtyCode").value);
  const field = document.getElementById("editQtyField").value;
  const newVal = number(document.getElementById("editQtyNewVal").value);
  const reason = document.getElementById("editQtyReason").value.trim();

  if (!closeDate || !branch || !itemCode) { appNotify("Vui lòng nhập đủ ngày, chi nhánh và mã giỏ.", "error"); return; }
  if (!reason) { appNotify("Vui lòng nhập lý do sửa.", "error"); return; }

  const row = findDashboardRow(closeDate, branch, itemCode);
  if (!row) { appNotify(`Không tìm thấy ${itemCode} tại ${branch} ngày ${closeDate}.`, "error"); return; }

  const oldVal = number(row[field]);
  if (oldVal === newVal) { appNotify("Giá trị mới giống giá trị cũ, không có gì thay đổi.", "error"); return; }

  const fieldLabel = EDIT_FIELD_LABELS[field] || field;
  let extraDetail = "";

  row[field] = newVal;
  cleanupZeroFields(row);

  if (field === "actualStock") {
    setNextDayOpeningFromActual({ closeDate, branch, itemCode, actualStock: newVal });
    extraDetail = " (đồng bộ tồn đầu ngày kế tiếp)";
  }

  if (field === "transferBranch" || field === "receiveBranch") {
    const counterBranch = document.getElementById("editQtyCounterBranch")?.value;
    if (!counterBranch || counterBranch === branch) { appNotify("Vui lòng chọn chi nhánh đối ứng khác chi nhánh hiện tại.", "error"); row[field] = oldVal; return; }
    const counterField = field === "transferBranch" ? "receiveBranch" : "transferBranch";
    let counterRow = findDashboardRow(closeDate, counterBranch, itemCode);
    if (!counterRow) {
      upsertDashboardRow({ closeDate, branch: counterBranch, itemCode, patch: {} });
      counterRow = findDashboardRow(closeDate, counterBranch, itemCode);
    }
    if (counterRow) {
      counterRow[counterField] = newVal;
      cleanupZeroFields(counterRow);
      extraDetail = ` (cập nhật ${counterField === "receiveBranch" ? "Nhận CN" : "Chuyển CN"} tại ${counterBranch})`;
    }
  }

  const logEntry = {
    createdAt: new Date().toLocaleString("vi-VN"),
    closeDate, branch, type: "Sửa SL", source: fieldLabel,
    wrongCode: "", rightCode: itemCode,
    qty: newVal, note: reason,
    user: getCurrentUserName(), status: "Đã sửa",
    detail: `${fieldLabel}: ${oldVal} → ${newVal}${extraDetail}`
  };

  adjustmentsLog.unshift(logEntry);
  renderAdjustments();
  renderDashboardByPermission();

  appNotify("loading");
  await Promise.all([dbSyncBatch(), dbSaveLog(logEntry)]);
  appNotify(`Đã sửa ${fieldLabel} của ${itemCode} (${branch}): ${oldVal} → ${newVal}.`, "success");
}

function setupEditQty() {
  ["editQtyDate","editQtyBranch","editQtyCode","editQtyField"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", () => { syncEditQtyCounterBox(); lookupEditQtyValue(); });
  });
  document.getElementById("editQtyCode")?.addEventListener("input", lookupEditQtyValue);
  syncEditQtyCounterBox();
  document.getElementById("btnApplyEditQty")?.addEventListener("click", applyEditQty);
}

window.bootNxt = async function (user) {
  if (window.NXT_API) NXT_API = window.NXT_API;
  currentUser = user;
  setupAppPopup();
  setupTabs(); setupOverview(); setupGiftIn(); setupStock(); setupCancel(); setupTransfer(); setupSapo(); setupWrongCode(); setupEditQty();
  applyLoginState();
  try {
    const [rowsRes, logsRes] = await Promise.all([
      fetch(`${NXT_API}/rows`, { credentials: "include" }),
      fetch(`${NXT_API}/logs`, { credentials: "include" })
    ]);
    if (rowsRes.ok) { const r = await rowsRes.json(); console.log("[NXT] rows raw:", r); dashboardRows = Array.isArray(r) ? r : (r?.content ?? []); console.log("[NXT] dashboardRows:", dashboardRows, "dòng"); }
    if (logsRes.ok) { const l = await logsRes.json(); adjustmentsLog = Array.isArray(l) ? l : (l?.content ?? []); }

  } catch (e) {
    console.warn("Không kết nối được API, dùng dữ liệu rỗng.", e);
  }
  // Thêm đoạn này vào cuối hàm window.bootNxt hoặc trước khi render dữ liệu
  const todayIso = new Date().toISOString().split('T')[0]; // Kết quả dạng: YYYY-MM-DD

  // Tự động điền vào các ô nhập ngày
  ["giftInDate", "stockDate", "cancelDate", "wrongCodeDate", "dateFrom", "dateTo"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = todayIso;
  });
  renderDashboardByPermission();
  renderAdjustments();
};

