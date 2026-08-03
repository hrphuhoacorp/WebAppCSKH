'use client';

import { useState } from "react";
import {
  Box, Button, Chip, IconButton, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography, alpha,
} from "@mui/material";
import { Plus, Trash2, Edit2, Check, X, Sparkles } from "lucide-react";
import { PriceTag } from "../types";
import { GREEN, CARD_RADIUS, BORDER, fieldSx } from "../styles";

interface ManualEditorProps {
  tags: PriceTag[];
  onAddTag: (tag: PriceTag) => void;
  onUpdateTag: (updated: PriceTag) => void;
  onDeleteTag: (id: string) => void;
  onClearAll: () => void;
  onLoadSamples: () => void;
}

export default function ManualEditor({
  tags,
  onAddTag,
  onUpdateTag,
  onDeleteTag,
  onClearAll,
  onLoadSamples
}: ManualEditorProps) {
  // New tag states
  const [newTag, setNewTag] = useState({
    name: "",
    origin: "",
    price: "",
    unit: ""
  });

  // Editing state trackers
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<PriceTag | null>(null);

  // Error validations
  const [validationError, setValidationError] = useState("");

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTag.name.trim()) {
      setValidationError("Vui lòng điền tên sản phẩm!");
      return;
    }
    const priceNum = parseInt(newTag.price.trim(), 10) || 0;

    const tag: PriceTag = {
      id: `tag-manual-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: newTag.name.trim(),
      origin: newTag.origin.trim() || "Việt Nam",
      price: priceNum,
      unit: newTag.unit.trim() || "Hộp",
      isPromo: false
    };

    onAddTag(tag);
    setNewTag({ name: "", origin: "", price: "", unit: "" });
    setValidationError("");
  };

  const startEditing = (tag: PriceTag) => {
    setEditingId(tag.id);
    setEditValues({ ...tag });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValues(null);
  };

  const saveEditing = () => {
    if (editValues && editValues.name.trim()) {
      onUpdateTag(editValues);
      setEditingId(null);
      setEditValues(null);
    }
  };

  return (
    <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, p: 3, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)' }}>

      {/* Title block */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 2.5, pb: 2, borderBottom: '1px solid #f1f5f9' }}>
        <Box>
          <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#1e293b' }}>
            📝 Nhập & Chỉnh Sửa Thủ Công
          </Typography>
          <Typography sx={{ fontSize: 11, color: '#94a3b8', mt: 0.3 }}>
            Điền form bên dưới hoặc nạp dữ liệu mẫu để thử.
          </Typography>
        </Box>

        {/* Bulk tools */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {tags.length === 0 && (
            <Button
              size="small"
              startIcon={<Sparkles size={14} />}
              onClick={onLoadSamples}
              sx={{ textTransform: 'none', fontWeight: 700, color: GREEN, borderRadius: '10px', border: `1px solid ${alpha(GREEN, 0.3)}`, bgcolor: alpha(GREEN, 0.06), '&:hover': { bgcolor: alpha(GREEN, 0.12) } }}
            >
              Nạp dữ liệu mẫu để thử
            </Button>
          )}
          {tags.length > 0 && (
            <Button
              size="small"
              startIcon={<Trash2 size={13} />}
              onClick={onClearAll}
              sx={{ textTransform: 'none', fontWeight: 700, color: '#dc2626', borderRadius: '10px', border: '1px solid #fecaca', bgcolor: '#fef2f2', '&:hover': { bgcolor: '#fee2e2' } }}
            >
              Xóa tất cả ({tags.length})
            </Button>
          )}
        </Box>
      </Box>

      {/* Standard tag form */}
      <Box
        component="form"
        onSubmit={handleAddNew}
        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' }, gap: 1.5, alignItems: 'end', mb: 3 }}
      >
        <TextField
          label="Tên sản phẩm *"
          size="small"
          placeholder="Ví dụ: Muối tôm Chân Ý FOODS"
          value={newTag.name}
          onChange={(e) => setNewTag(prev => ({ ...prev, name: e.target.value }))}
          sx={{ ...fieldSx, gridColumn: { md: 'span 4' } }}
        />
        <TextField
          label="Xuất xứ"
          size="small"
          placeholder="Ví dụ: Việt Nam"
          value={newTag.origin}
          onChange={(e) => setNewTag({ ...newTag, origin: e.target.value })}
          sx={{ ...fieldSx, gridColumn: { md: 'span 2' } }}
        />
        <TextField
          label="Giá bán (VNĐ)"
          size="small"
          type="number"
          placeholder="Ví dụ: 260000"
          value={newTag.price}
          onChange={(e) => setNewTag({ ...newTag, price: e.target.value })}
          sx={{ ...fieldSx, gridColumn: { md: 'span 2' } }}
        />
        <TextField
          label="Đơn vị tính"
          size="small"
          placeholder="Ví dụ: Hũ, Kg, Chai"
          value={newTag.unit}
          onChange={(e) => setNewTag({ ...newTag, unit: e.target.value })}
          sx={{ ...fieldSx, gridColumn: { md: 'span 2' } }}
        />
        <Button
          type="submit"
          variant="contained"
          startIcon={<Plus size={16} />}
          sx={{ gridColumn: { md: 'span 2' }, bgcolor: GREEN, '&:hover': { bgcolor: '#065f2d' }, textTransform: 'none', fontWeight: 700, borderRadius: '10px', height: 40 }}
        >
          Thêm mới
        </Button>
      </Box>

      {validationError && (
        <Typography sx={{ color: '#dc2626', fontSize: 12, fontWeight: 600, mb: 2, mt: -1.5 }}>{validationError}</Typography>
      )}

      {/* Tags list table */}
      {tags.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 5, border: `1px dashed ${BORDER}`, borderRadius: '14px' }}>
          <Typography sx={{ fontSize: 13, color: '#94a3b8' }}>Bảng trống. Hãy kéo thả file Excel lên hoặc bấm nút nạp dữ liệu mẫu!</Typography>
        </Box>
      ) : (
        <TableContainer sx={{ maxHeight: 400, border: `1px solid ${BORDER}`, borderRadius: '14px' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#64748b', bgcolor: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Tên sản phẩm</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#64748b', bgcolor: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Xuất xứ</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#64748b', bgcolor: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Giá bán</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#64748b', bgcolor: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Đơn vị tính</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: 11, color: '#64748b', bgcolor: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tags.map((tag) => {
                const isEditing = editingId === tag.id;
                return (
                  <TableRow key={tag.id} hover sx={isEditing ? { bgcolor: alpha(GREEN, 0.04) } : undefined}>
                    {/* PRODUCT NAME */}
                    <TableCell sx={{ maxWidth: 220 }}>
                      {isEditing && editValues ? (
                        <TextField
                          size="small"
                          value={editValues.name}
                          onChange={(e) => setEditValues(prev => prev ? { ...prev, name: e.target.value } : prev)}
                          sx={fieldSx}
                          fullWidth
                        />
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {tag.isPromo && (
                            <Chip label="PROMO" size="small" sx={{ height: 18, fontSize: 9, fontWeight: 800, bgcolor: '#fce7f3', color: '#be185d' }} />
                          )}
                          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tag.name}
                          </Typography>
                        </Box>
                      )}
                    </TableCell>

                    {/* ORIGIN */}
                    <TableCell>
                      {isEditing && editValues ? (
                        <TextField
                          size="small"
                          value={editValues.origin}
                          onChange={(e) => setEditValues({ ...editValues, origin: e.target.value })}
                          sx={fieldSx}
                        />
                      ) : (
                        <Typography sx={{ fontSize: 13, color: '#475569' }}>{tag.origin}</Typography>
                      )}
                    </TableCell>

                    {/* PRICE */}
                    <TableCell>
                      {isEditing && editValues ? (
                        <TextField
                          size="small"
                          type="number"
                          value={editValues.price}
                          onChange={(e) => setEditValues({ ...editValues, price: parseInt(e.target.value, 10) || 0 })}
                          sx={fieldSx}
                        />
                      ) : (
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{tag.price.toLocaleString("vi-VN")} đ</Typography>
                      )}
                    </TableCell>

                    {/* UNIT */}
                    <TableCell>
                      {isEditing && editValues ? (
                        <TextField
                          size="small"
                          value={editValues.unit}
                          onChange={(e) => setEditValues({ ...editValues, unit: e.target.value })}
                          sx={fieldSx}
                        />
                      ) : (
                        <Typography sx={{ fontSize: 13, color: '#475569' }}>{tag.unit}</Typography>
                      )}
                    </TableCell>

                    {/* ACTIONS */}
                    <TableCell align="center">
                      {isEditing ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          <IconButton size="small" onClick={saveEditing} sx={{ color: GREEN }} title="Lưu">
                            <Check size={16} />
                          </IconButton>
                          <IconButton size="small" onClick={cancelEditing} sx={{ color: '#94a3b8' }} title="Hủy">
                            <X size={16} />
                          </IconButton>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          <IconButton size="small" onClick={() => startEditing(tag)} sx={{ color: '#94a3b8', '&:hover': { color: GREEN, bgcolor: alpha(GREEN, 0.08) } }} title="Chỉnh sửa">
                            <Edit2 size={14} />
                          </IconButton>
                          <IconButton size="small" onClick={() => onDeleteTag(tag.id)} sx={{ color: '#94a3b8', '&:hover': { color: '#dc2626', bgcolor: '#fef2f2' } }} title="Xóa dòng">
                            <Trash2 size={14} />
                          </IconButton>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

    </Paper>
  );
}
