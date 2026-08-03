'use client';

import React, { useMemo, useRef, useState } from "react";
import { PriceTag, PrintSettings } from "../types";
import { Printer, Sliders, RefreshCw, Eye } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import {
  Box, Button, Chip, Checkbox, FormControlLabel, MenuItem, Paper,
  Slider, TextField, ToggleButton, ToggleButtonGroup, Typography, alpha,
} from "@mui/material";
import PriceTagCard from "./PriceTagCard";
import PriceTagPrintView from "./PriceTagPrintView";
import { GREEN, CARD_RADIUS, BORDER, fieldSx } from "../styles";

interface PrintPreviewProps {
  tags: PriceTag[];
  settings: PrintSettings;
  setSettings: React.Dispatch<React.SetStateAction<PrintSettings>>;
}

type FontSizeKey = 'fontSizeName' | 'fontSizeOrigin' | 'fontSizePrice' | 'fontSizeUnit';

export default function PrintPreview({ tags, settings, setSettings }: PrintPreviewProps) {
  // Determine grid dimensions based on orientation
  // Portrait: 3 columns, 7 rows -> 21 tags per A4 page (width 65mm x height 38mm each)
  // Landscape: 4 columns, 5 rows -> 20 tags per A4 page (width 65mm x height 38mm each)
  const cols = settings.orientation === "portrait" ? 3 : 4;
  const rows = settings.orientation === "portrait" ? 7 : 5;
  const itemsPerPage = cols * rows;

  // Calculate sheets based on orientation columns and rows
  const pages = useMemo(() => {
    const totalPages = Math.ceil(tags.length / itemsPerPage) || 1;
    const result = [];

    for (let p = 0; p < totalPages; p++) {
      const pageTags = [];
      const startIndex = p * itemsPerPage;

      // Pull up to itemsPerPage items for this page
      for (let i = 0; i < itemsPerPage; i++) {
        const itemIndex = startIndex + i;
        if (itemIndex < tags.length) {
          pageTags.push(tags[itemIndex]);
        } else {
          // Push null for blank space fillers
          pageTags.push(null);
        }
      }
      result.push(pageTags);
    }

    return result;
  }, [tags, itemsPerPage]);

  const gapSize = "0.5mm";

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Bang_Gia_${new Date().getTime()}`,
    pageStyle: `@page { margin: 0; } html, body { margin: 0 !important; padding: 0 !important; }`,
  });

  // Border colors available
  const colors = [
    { name: "Xanh lá đậm", value: "#014122" },
    { name: "Đỏ siêu thị", value: "#b91c1c" },
    { name: "Đỏ đậm", value: "#881337" },
    { name: "Xanh dương", value: "#1e3a8a" },
    { name: "Đen tuyền", value: "#0f172a" }
  ];


  const fontSizeControls: { label: string; key: FontSizeKey; def: number }[] = [
    { label: "Tên sản phẩm", key: "fontSizeName", def: 120 },
    { label: "Xuất xứ", key: "fontSizeOrigin", def: 95 },
    { label: "Giá số chính", key: "fontSizePrice", def: 130 },
    { label: "Đơn vị & Số lẻ", key: "fontSizeUnit", def: 140 },
  ];

  const handleResetFontSizes = () => {
    setSettings((prev) => ({
      ...prev,
      fontSizeName: 120,
      fontSizeOrigin: 95,
      fontSizePrice: 130,
      fontSizeUnit: 140
    }));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* Settings Panel & Quick Actions (Not printed) */}
      <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, p: 3, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)' }}>
        <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1, mb: 3.5 }}>
          <Sliders color={GREEN} size={20} />
          Cấu Hình In & Kiểu Dáng Bảng Giá
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' }, gap: 3, mb: 3.5 }}>
          {/* Theme Color */}
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748b', mb: 0.75 }}>Màu khung & nội dung</Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={settings.borderColor}
              onChange={(e) => setSettings({ ...settings, borderColor: e.target.value, textColor: e.target.value })}
              sx={fieldSx}
            >
              <MenuItem value="#086839">Xanh lá truyền thống</MenuItem>
              {colors.map((c) => (
                <MenuItem key={c.value} value={c.value}>{c.name}</MenuItem>
              ))}
            </TextField>
          </Box>


          {/* Orientation selection */}
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748b', mb: 0.75 }}>Hướng trang in A4</Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              value={settings.orientation}
              onChange={(_, v) => v && setSettings({ ...settings, orientation: v })}
              sx={{
                bgcolor: '#f1f5f9', p: 0.5, borderRadius: '10px', height: 40,
                '& .MuiToggleButton-root': {
                  border: 'none', borderRadius: '8px !important', textTransform: 'none',
                  fontWeight: 700, fontSize: 12, color: '#64748b',
                  '&.Mui-selected': { bgcolor: '#fff', color: '#1e293b', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', '&:hover': { bgcolor: '#fff' } },
                },
              }}
            >
              <ToggleButton value="portrait">In Dọc</ToggleButton>
              <ToggleButton value="landscape">In Ngang</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Supplementary custom check options to tune output quality */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5, borderTop: '1px solid #f1f5f9', pt: 2.5, mb: 2.5 }}>
          <FormControlLabel
            control={<Checkbox size="small" checked={settings.showBorder} onChange={(e) => setSettings({ ...settings, showBorder: e.target.checked })} sx={{ color: BORDER, '&.Mui-checked': { color: GREEN } }} />}
            label={<Typography sx={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Hiển thị đường viền nhãn giá</Typography>}
          />
          <FormControlLabel
            control={<Checkbox size="small" checked={settings.borderWidth === 3} onChange={(e) => setSettings({ ...settings, borderWidth: e.target.checked ? 3 : 1.5 })} sx={{ color: BORDER, '&.Mui-checked': { color: GREEN } }} />}
            label={<Typography sx={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Nét viền đậm màu siêu thị dày (3px)</Typography>}
          />
        </Box>

        {/* Tùy chỉnh kích thước chữ từng mục */}
        <Box sx={{ borderTop: '1px solid #f1f5f9', pt: 2.5, mb: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 1, mb: 2 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🔤 Điều chỉnh cỡ chữ từng loại (%)
            </Typography>
            <Button
              size="small"
              startIcon={<RefreshCw size={12} />}
              onClick={handleResetFontSizes}
              sx={{ textTransform: 'none', fontWeight: 700, fontSize: 11, color: GREEN, border: `1px solid ${alpha(GREEN, 0.3)}`, borderRadius: '8px', '&:hover': { bgcolor: alpha(GREEN, 0.06) } }}
            >
              Đặt lại cỡ chữ chuẩn
            </Button>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
            {fontSizeControls.map((f) => (
              <Box key={f.key} sx={{ bgcolor: '#f8fafc', borderRadius: '12px', p: 1.75, border: '1px solid #f1f5f9' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{f.label}</Typography>
                  <Chip label={`${settings[f.key] ?? f.def}%`} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 800, bgcolor: alpha(GREEN, 0.1), color: GREEN }} />
                </Box>
                <Slider
                  size="small"
                  min={70}
                  max={150}
                  step={5}
                  value={settings[f.key] ?? f.def}
                  onChange={(_, v) => setSettings({ ...settings, [f.key]: v as number })}
                  sx={{ color: GREEN, py: 1 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: 10, color: '#94a3b8' }}>Nhỏ (70%)</Typography>
                  <Typography sx={{ fontSize: 10, color: '#94a3b8' }}>To (150%)</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* CTA triggers */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 2, borderTop: '1px solid #f1f5f9', pt: 2.5 }}>
          <Typography sx={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
            Chọn khổ giấy A4, tỷ lệ hiển thị 100% (Default) và bật tùy chọn In hình nền (Background graphics) để bản in hoàn hảo nhất!
          </Typography>

          <Button
            onClick={() => handlePrint()}
            variant="contained"
            startIcon={<Printer size={18} />}
            sx={{ bgcolor: GREEN, '&:hover': { bgcolor: '#065f2d' }, textTransform: 'none', fontWeight: 700, borderRadius: '12px', px: 3, py: 1.25, whiteSpace: 'nowrap', boxShadow: 'none' }}
          >
            In Bảng Giá Ngay (A4)
          </Button>
        </Box>
      </Paper>

      {/* Screen Interactive Grid layout preview (Will hide during print layout) */}
      <div className="bg-zinc-50 rounded-xl p-6 border border-zinc-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-zinc-700 flex items-center gap-1.5">
            <Eye size={16} />
            Xem trước bố cục bản in ({pages.length} trang)
          </h3>
          <span className="text-xs text-zinc-500 font-medium">
            {settings.orientation === "portrait"
              ? "3 cột x 7 hàng (21 nhãn/trang A4) | Kích thước cố định 65mm x 36mm"
              : "4 cột x 5 hàng (20 nhãn/trang A4) | Kích thước cố định 65mm x 36mm"}
          </span>
        </div>

        {/* Scrolling list showing pages mockups with proper boundaries */}
        <div className="space-y-8 select-none">
          {pages.map((pageTags, pageIdx) => (
            <div key={pageIdx} className="relative">
              {/* Sheet Indicator Badge */}
              <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[11px] font-bold px-2.5 py-0.5 rounded shadow z-10">
                A4 Trang {pageIdx + 1} / {pages.length}
              </div>

              {/* Box frame replicating actual print sheet sizes */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-md p-4 pt-8 overflow-x-auto">
                <div
                  className="mx-auto border border-zinc-200 bg-white shadow-sm flex-shrink-0 relative"
                  style={{
                    width: settings.orientation === "portrait" ? "210mm" : "297mm",
                    height: settings.orientation === "portrait" ? "297mm" : "210mm",
                    maxWidth: "100%",
                    boxSizing: "border-box"
                  }}
                >
                  <div
                    className="grid bg-white w-full h-full"
                    style={{
                      width: "100%",
                      height: "100%",
                      gridTemplateColumns: settings.orientation === "portrait" ? "repeat(3, 65mm)" : "repeat(4, 65mm)",
                      gridTemplateRows: settings.orientation === "portrait" ? "repeat(7, 36mm)" : "repeat(5, 36mm)",
                      gap: gapSize,
                      paddingLeft: settings.orientation === "portrait" ? "7.5mm" : "18.5mm",
                      paddingRight: settings.orientation === "portrait" ? "7.5mm" : "18.5mm",
                      paddingTop: settings.orientation === "portrait" ? "15.5mm" : "10mm",
                      paddingBottom: settings.orientation === "portrait" ? "15.5mm" : "10mm",
                      boxSizing: "border-box",
                      alignContent: "start",
                      justifyContent: "start"
                    }}
                  >
                    {pageTags.map((tag, i) => (
                      <div
                        key={tag ? tag.id : `filler-${pageIdx}-${i}`}
                        className="h-full w-full"
                        style={{
                          width: "65mm",
                          height: "36mm",
                          boxSizing: "border-box"
                        }}
                      >
                        {tag ? (
                          <PriceTagCard tag={tag} settings={settings} preview={false} />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hidden print-only content, isolated by react-to-print (see useReactToPrint above) */}
      <div className="hidden">
        <PriceTagPrintView ref={printRef} pages={pages} settings={settings} gapSize={gapSize} />
      </div>

    </Box>
  );
}
