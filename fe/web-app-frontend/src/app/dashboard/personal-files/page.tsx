'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Box, Breadcrumbs, Button, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, Link as MuiLink, Paper, TextField, Tooltip, Typography, LinearProgress,
    Menu, MenuItem, ListItemIcon, ListItemText, InputAdornment, Checkbox, List, ListItem, ListItemButton,
    ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import ArchiveRoundedIcon from '@mui/icons-material/ArchiveRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import CreateNewFolderRoundedIcon from '@mui/icons-material/CreateNewFolderRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DriveFileRenameOutlineRoundedIcon from '@mui/icons-material/DriveFileRenameOutlineRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import ContentCutRoundedIcon from '@mui/icons-material/ContentCutRounded';
import ContentPasteRoundedIcon from '@mui/icons-material/ContentPasteRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded';
import RestoreFromTrashRoundedIcon from '@mui/icons-material/RestoreFromTrashRounded';
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import ViewListRoundedIcon from '@mui/icons-material/ViewListRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import PageHeader from '@/components/common/PageHeader';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import {
    personalFilesApi, personalFileContentUrl, personalFileDownloadUrl,
    PersonalFileDto, PersonalRecycleItemDto,
} from '@/features/personal-files/api/personalFiles.api';
import { errMessage } from '@/lib/errMessage';

const GREEN = '#086839';
const CARD_RADIUS = '20px';
const BORDER = '#e2e8f0';

function nowMs(): number {
    return Date.now();
}

function readStoredViewMode(): 'grid' | 'list' {
    if (typeof window === 'undefined') return 'grid';
    const stored = localStorage.getItem('personal-files-view-mode');
    return stored === 'grid' || stored === 'list' ? stored : 'grid';
}

function fmtSize(bytes?: number | null): string {
    if (!bytes && bytes !== 0) return '';
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function fmtDate(iso?: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fileIcon(mimeType?: string | null, size = 40) {
    const mt = mimeType || '';
    if (mt.startsWith('image/')) return <ImageRoundedIcon sx={{ fontSize: size, color: '#0ea5e9' }} />;
    if (mt === 'application/pdf') return <PictureAsPdfRoundedIcon sx={{ fontSize: size, color: '#dc2626' }} />;
    if (mt.includes('zip') || mt.includes('rar') || mt.includes('compressed')) return <ArchiveRoundedIcon sx={{ fontSize: size, color: '#b45309' }} />;
    if (mt.includes('word') || mt.includes('document') || mt.includes('sheet') || mt.includes('excel') || mt.includes('presentation')) return <DescriptionRoundedIcon sx={{ fontSize: size, color: GREEN }} />;
    return <InsertDriveFileRoundedIcon sx={{ fontSize: size, color: '#94a3b8' }} />;
}

type ItemType = 'folder' | 'file';
type ItemKey = string; // `${type}-${id}`

interface OrderedItem {
    key: ItemKey;
    id: number;
    type: ItemType;
    name: string;
}

function keyOf(type: ItemType, id: number): ItemKey {
    return `${type}-${id}`;
}

function parseKey(key: ItemKey): { type: ItemType; id: number } {
    const idx = key.indexOf('-');
    return { type: key.slice(0, idx) as ItemType, id: Number(key.slice(idx + 1)) };
}

export default function PersonalFilesPage() {
    const qc = useQueryClient();
    const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);

    const [selectedKeys, setSelectedKeys] = useState<Set<ItemKey>>(new Set());
    const [focusedKey, setFocusedKey] = useState<ItemKey | null>(null);
    const [anchorKey, setAnchorKey] = useState<ItemKey | null>(null);

    const [createFolderOpen, setCreateFolderOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [renameTarget, setRenameTarget] = useState<{ id: number; type: ItemType; name: string } | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [busy, setBusy] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    const [clipboard, setClipboard] = useState<{ mode: 'copy' | 'cut'; folderIds: number[]; fileIds: number[] } | null>(null);
    const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; hasItem: boolean } | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const typeAheadRef = useRef<{ buffer: string; lastTime: number }>({ buffer: '', lastTime: 0 });

    const [trashOpen, setTrashOpen] = useState(false);
    const [trashLoading, setTrashLoading] = useState(false);
    const [trashItems, setTrashItems] = useState<PersonalRecycleItemDto[]>([]);
    const [trashSelected, setTrashSelected] = useState<Set<string>>(new Set());
    const [permanentDeleteConfirmOpen, setPermanentDeleteConfirmOpen] = useState(false);

    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => readStoredViewMode());

    useEffect(() => {
        localStorage.setItem('personal-files-view-mode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
        return () => clearTimeout(t);
    }, [searchQuery]);

    const { data: items, isLoading } = useQuery({
        queryKey: ['personal-files-items', currentFolderId, debouncedSearch],
        queryFn: () => personalFilesApi.getItems(currentFolderId, debouncedSearch || undefined),
    });

    const folders = items?.folders ?? [];
    const files = items?.files ?? [];
    const breadcrumb = items?.breadcrumb ?? [];

    const orderedItems: OrderedItem[] = useMemo(() => [
        ...(items?.folders ?? []).map(f => ({ key: keyOf('folder', f.id), id: f.id, type: 'folder' as const, name: f.name })),
        ...(items?.files ?? []).map(f => ({ key: keyOf('file', f.id), id: f.id, type: 'file' as const, name: f.fileName })),
    ], [items]);

    const keyIndex = useMemo(() => {
        const m = new Map<ItemKey, number>();
        orderedItems.forEach((it, i) => m.set(it.key, i));
        return m;
    }, [orderedItems]);

    function refresh() {
        qc.invalidateQueries({ queryKey: ['personal-files-items', currentFolderId] });
    }

    function clearSelection() {
        setSelectedKeys(new Set());
        setFocusedKey(null);
        setAnchorKey(null);
    }

    function openFolder(id: number | null) {
        setCurrentFolderId(id);
        setSearchQuery('');
        setDebouncedSearch('');
        clearSelection();
    }

    function goUp() {
        if (currentFolderId === null) return;
        const parentId = breadcrumb.length >= 2 ? breadcrumb[breadcrumb.length - 2].id : null;
        openFolder(parentId);
    }

    function openFile(file: PersonalFileDto) {
        window.open(personalFileContentUrl(file.id), '_blank', 'noopener,noreferrer');
    }

    function getColumns(): number {
        if (viewMode === 'list' || !gridRef.current) return 1;
        const style = getComputedStyle(gridRef.current);
        const cols = style.gridTemplateColumns.split(' ').filter(Boolean).length;
        return Math.max(1, cols);
    }

    function scrollKeyIntoView(key: ItemKey) {
        const el = gridRef.current?.querySelector(`[data-key="${CSS.escape(key)}"]`);
        el?.scrollIntoView({ block: 'nearest' });
    }

    function selectSingle(item: OrderedItem) {
        setSelectedKeys(new Set([item.key]));
        setFocusedKey(item.key);
        setAnchorKey(item.key);
    }

    function selectRange(fromKey: ItemKey, toIndex: number) {
        const fromIndex = keyIndex.get(fromKey) ?? toIndex;
        const [lo, hi] = fromIndex <= toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex];
        setSelectedKeys(new Set(orderedItems.slice(lo, hi + 1).map(it => it.key)));
    }

    function onItemClick(e: React.MouseEvent, item: OrderedItem) {
        const idx = keyIndex.get(item.key)!;
        if (e.shiftKey) {
            selectRange(anchorKey ?? item.key, idx);
            setFocusedKey(item.key);
            if (!anchorKey) setAnchorKey(item.key);
        } else if (e.ctrlKey || e.metaKey) {
            setSelectedKeys(prev => {
                const next = new Set(prev);
                if (next.has(item.key)) next.delete(item.key); else next.add(item.key);
                return next;
            });
            setFocusedKey(item.key);
            setAnchorKey(item.key);
        } else {
            selectSingle(item);
        }
    }

    function openItem(item: OrderedItem) {
        if (item.type === 'folder') {
            openFolder(item.id);
        } else {
            const f = files.find(x => x.id === item.id);
            if (f) openFile(f);
        }
    }

    function selectionIds(): { folderIds: number[]; fileIds: number[] } {
        const folderIds: number[] = [];
        const fileIds: number[] = [];
        selectedKeys.forEach(k => {
            const { type, id } = parseKey(k);
            if (type === 'folder') folderIds.push(id); else fileIds.push(id);
        });
        return { folderIds, fileIds };
    }

    async function handlePaste() {
        if (!clipboard || (clipboard.folderIds.length === 0 && clipboard.fileIds.length === 0)) return;
        setBusy(true);
        try {
            const selection = { folderIds: clipboard.folderIds, fileIds: clipboard.fileIds };
            if (clipboard.mode === 'copy') {
                await personalFilesApi.copy(selection, currentFolderId);
                toast.success('Đã dán (sao chép)');
            } else {
                await personalFilesApi.move(selection, currentFolderId);
                toast.success('Đã dán (di chuyển)');
                setClipboard(null);
            }
            refresh();
        } catch (err) {
            toast.error(errMessage(err, 'Dán thất bại'));
        } finally {
            setBusy(false);
        }
    }

    function trashKeyOf(item: PersonalRecycleItemDto): string {
        return `${item.isFolder ? 'folder' : 'file'}-${item.id}`;
    }

    async function openTrash() {
        setTrashOpen(true);
        setTrashSelected(new Set());
        setTrashLoading(true);
        try {
            const list = await personalFilesApi.getTrash();
            setTrashItems(list);
        } catch (err) {
            toast.error(errMessage(err, 'Không tải được thùng rác'));
        } finally {
            setTrashLoading(false);
        }
    }

    function toggleTrashSelect(item: PersonalRecycleItemDto) {
        setTrashSelected(prev => {
            const next = new Set(prev);
            const k = trashKeyOf(item);
            if (next.has(k)) next.delete(k); else next.add(k);
            return next;
        });
    }

    function toggleTrashSelectAll() {
        setTrashSelected(prev => prev.size === trashItems.length ? new Set() : new Set(trashItems.map(trashKeyOf)));
    }

    function trashSelectionIds(): { folderIds: number[]; fileIds: number[] } {
        const folderIds: number[] = [];
        const fileIds: number[] = [];
        trashSelected.forEach(k => {
            const idx = k.indexOf('-');
            const type = k.slice(0, idx);
            const id = Number(k.slice(idx + 1));
            if (type === 'folder') folderIds.push(id); else fileIds.push(id);
        });
        return { folderIds, fileIds };
    }

    async function handleTrashRestore() {
        const ids = trashSelectionIds();
        if (ids.folderIds.length === 0 && ids.fileIds.length === 0) return;
        setBusy(true);
        try {
            await personalFilesApi.restore(ids);
            toast.success('Đã khôi phục');
            setTrashSelected(new Set());
            const list = await personalFilesApi.getTrash();
            setTrashItems(list);
            refresh();
        } catch (err) {
            toast.error(errMessage(err, 'Khôi phục thất bại'));
        } finally {
            setBusy(false);
        }
    }

    async function handleTrashPermanentDeleteConfirm() {
        const ids = trashSelectionIds();
        if (ids.folderIds.length === 0 && ids.fileIds.length === 0) return;
        setBusy(true);
        try {
            await personalFilesApi.permanentDelete(ids);
            toast.success('Đã xóa vĩnh viễn');
            setTrashSelected(new Set());
            setPermanentDeleteConfirmOpen(false);
            const list = await personalFilesApi.getTrash();
            setTrashItems(list);
        } catch (err) {
            toast.error(errMessage(err, 'Xóa vĩnh viễn thất bại'));
        } finally {
            setBusy(false);
        }
    }

    function onGridKeyDown(e: React.KeyboardEvent) {
        if (orderedItems.length === 0) return;

        const isArrow = e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'ArrowUp';
        if (isArrow) {
            e.preventDefault();
            const currentIndex = focusedKey ? (keyIndex.get(focusedKey) ?? -1) : -1;
            let next: number;
            if (currentIndex === -1) {
                next = 0;
            } else {
                const cols = getColumns();
                if (e.key === 'ArrowRight') next = Math.min(orderedItems.length - 1, currentIndex + 1);
                else if (e.key === 'ArrowLeft') next = Math.max(0, currentIndex - 1);
                else if (e.key === 'ArrowDown') next = Math.min(orderedItems.length - 1, currentIndex + cols);
                else next = Math.max(0, currentIndex - cols);
            }
            const nextItem = orderedItems[next];
            if (e.shiftKey) {
                selectRange(anchorKey ?? nextItem.key, next);
                if (!anchorKey) setAnchorKey(focusedKey ?? nextItem.key);
            } else {
                setSelectedKeys(new Set([nextItem.key]));
                setAnchorKey(nextItem.key);
            }
            setFocusedKey(nextItem.key);
            scrollKeyIntoView(nextItem.key);
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
            e.preventDefault();
            setSelectedKeys(new Set(orderedItems.map(it => it.key)));
            setAnchorKey(orderedItems[0].key);
            if (!focusedKey) setFocusedKey(orderedItems[0].key);
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (focusedKey) {
                const idx = keyIndex.get(focusedKey);
                if (idx !== undefined) openItem(orderedItems[idx]);
            }
            return;
        }

        if (e.key === 'Backspace') {
            e.preventDefault();
            goUp();
            return;
        }

        if (e.key === 'F2') {
            e.preventDefault();
            openRename();
            return;
        }

        if (e.key === 'Delete') {
            e.preventDefault();
            if (selectedKeys.size > 0) setDeleteConfirmOpen(true);
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
            e.preventDefault();
            if (selectedKeys.size > 0) setClipboard({ mode: 'copy', ...selectionIds() });
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
            e.preventDefault();
            if (selectedKeys.size > 0) setClipboard({ mode: 'cut', ...selectionIds() });
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
            e.preventDefault();
            handlePaste();
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            searchInputRef.current?.focus();
            searchInputRef.current?.select();
            return;
        }

        // type-ahead: typing a printable character jumps to the next item whose name starts with it
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            const now = nowMs();
            const state = typeAheadRef.current;
            if (now - state.lastTime > 800) state.buffer = '';
            state.buffer += e.key.toLowerCase();
            state.lastTime = now;

            const currentIndex = focusedKey ? (keyIndex.get(focusedKey) ?? -1) : -1;
            const n = orderedItems.length;
            let matchIndex = -1;
            for (let offset = 1; offset <= n; offset++) {
                const idx = (currentIndex + offset) % n;
                if (orderedItems[idx].name.toLowerCase().startsWith(state.buffer)) { matchIndex = idx; break; }
            }
            if (matchIndex === -1 && currentIndex >= 0 && orderedItems[currentIndex].name.toLowerCase().startsWith(state.buffer)) {
                matchIndex = currentIndex;
            }
            if (matchIndex !== -1) {
                const item = orderedItems[matchIndex];
                selectSingle(item);
                scrollKeyIntoView(item.key);
            }
        }
    }

    async function handleCreateFolder() {
        if (!newFolderName.trim()) { toast.error('Nhập tên thư mục'); return; }
        setBusy(true);
        try {
            await personalFilesApi.createFolder(newFolderName.trim(), currentFolderId);
            toast.success('Đã tạo thư mục');
            setCreateFolderOpen(false);
            setNewFolderName('');
            refresh();
        } catch (err) {
            toast.error(errMessage(err, 'Tạo thư mục thất bại'));
        } finally {
            setBusy(false);
        }
    }

    async function handleUploadFiles(fileList: FileList | null) {
        if (!fileList || fileList.length === 0) return;
        setUploading(true);
        setUploadProgress(0);
        try {
            const fl = Array.from(fileList);
            const result = await personalFilesApi.upload(currentFolderId, fl, setUploadProgress);
            toast.success(`Đã tải lên ${result.length} file`);
            refresh();
        } catch (err) {
            toast.error(errMessage(err, 'Tải lên thất bại'));
        } finally {
            setUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    function openRename() {
        if (selectedKeys.size !== 1) return;
        const key = [...selectedKeys][0];
        const { type, id } = parseKey(key);
        if (type === 'folder') {
            const f = folders.find(x => x.id === id);
            if (!f) return;
            setRenameTarget({ id: f.id, type: 'folder', name: f.name });
            setRenameValue(f.name);
        } else {
            const f = files.find(x => x.id === id);
            if (!f) return;
            setRenameTarget({ id: f.id, type: 'file', name: f.fileName });
            setRenameValue(f.fileName);
        }
    }

    async function handleRenameConfirm() {
        if (!renameTarget || !renameValue.trim()) return;
        setBusy(true);
        try {
            if (renameTarget.type === 'folder') await personalFilesApi.renameFolder(renameTarget.id, renameValue.trim());
            else await personalFilesApi.renameFile(renameTarget.id, renameValue.trim());
            toast.success('Đã đổi tên');
            setRenameTarget(null);
            refresh();
        } catch (err) {
            toast.error(errMessage(err, 'Đổi tên thất bại'));
        } finally {
            setBusy(false);
        }
    }

    async function handleDeleteConfirm() {
        if (selectedKeys.size === 0) return;
        setBusy(true);
        try {
            await personalFilesApi.delete(selectionIds());
            toast.success('Đã chuyển vào thùng rác');
            setDeleteConfirmOpen(false);
            clearSelection();
            refresh();
        } catch (err) {
            toast.error(errMessage(err, 'Xóa thất bại'));
        } finally {
            setBusy(false);
        }
    }

    const hasSelection = selectedKeys.size > 0;
    const singleSelectedKey = selectedKeys.size === 1 ? [...selectedKeys][0] : null;
    const singleSelectedFile = singleSelectedKey && parseKey(singleSelectedKey).type === 'file'
        ? files.find(f => f.id === parseKey(singleSelectedKey).id) : null;

    const cutKeys = useMemo(() => {
        if (clipboard?.mode !== 'cut') return new Set<ItemKey>();
        return new Set<ItemKey>([
            ...clipboard.folderIds.map(id => keyOf('folder', id)),
            ...clipboard.fileIds.map(id => keyOf('file', id)),
        ]);
    }, [clipboard]);

    function closeContextMenu() {
        setContextMenu(null);
    }

    function onItemContextMenu(e: React.MouseEvent, item: OrderedItem) {
        e.preventDefault();
        e.stopPropagation();
        if (!selectedKeys.has(item.key)) selectSingle(item);
        setContextMenu({ mouseX: e.clientX + 2, mouseY: e.clientY - 4, hasItem: true });
    }

    function onBackgroundContextMenu(e: React.MouseEvent) {
        e.preventDefault();
        clearSelection();
        setContextMenu({ mouseX: e.clientX + 2, mouseY: e.clientY - 4, hasItem: false });
    }

    interface MenuAction { key: string; label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean }

    function buildMenuActions(): MenuAction[] {
        if (!contextMenu) return [];
        if (!contextMenu.hasItem) {
            return [
                { key: 'newFolder', label: 'Thư mục mới', icon: <CreateNewFolderRoundedIcon fontSize="small" />, onClick: () => setCreateFolderOpen(true) },
                { key: 'paste', label: 'Dán vào đây', icon: <ContentPasteRoundedIcon fontSize="small" />, onClick: handlePaste, disabled: !clipboard },
            ];
        }
        const actions: MenuAction[] = [];
        if (selectedKeys.size === 1 && singleSelectedKey) {
            const item = orderedItems.find(it => it.key === singleSelectedKey);
            if (item) {
                actions.push({ key: 'open', label: item.type === 'folder' ? 'Mở' : 'Xem', icon: <FolderOpenRoundedIcon fontSize="small" />, onClick: () => openItem(item) });
            }
        }
        actions.push({ key: 'rename', label: 'Đổi tên', icon: <DriveFileRenameOutlineRoundedIcon fontSize="small" />, onClick: openRename, disabled: selectedKeys.size !== 1 });
        if (singleSelectedFile) {
            actions.push({ key: 'download', label: 'Tải xuống', icon: <UploadFileRoundedIcon fontSize="small" sx={{ transform: 'rotate(180deg)' }} />, onClick: () => window.open(personalFileDownloadUrl(singleSelectedFile.id), '_blank', 'noopener,noreferrer') });
        }
        actions.push({ key: 'copy', label: 'Sao chép', icon: <ContentCopyRoundedIcon fontSize="small" />, onClick: () => setClipboard({ mode: 'copy', ...selectionIds() }) });
        actions.push({ key: 'cut', label: 'Cắt', icon: <ContentCutRoundedIcon fontSize="small" />, onClick: () => setClipboard({ mode: 'cut', ...selectionIds() }) });
        actions.push({ key: 'paste', label: 'Dán vào đây', icon: <ContentPasteRoundedIcon fontSize="small" />, onClick: handlePaste, disabled: !clipboard });
        actions.push({ key: 'delete', label: 'Xóa', icon: <DeleteOutlineRoundedIcon fontSize="small" />, onClick: () => setDeleteConfirmOpen(true), danger: true });
        return actions;
    }

    const menuActions = buildMenuActions();

    return (
        <Box sx={{
            p: { xs: 2, md: 4 }, height: { xs: 'calc(100vh - 56px)', lg: '100vh' }, display: 'flex', flexDirection: 'column',
            bgcolor: '#f0f7f3', backgroundImage: 'radial-gradient(ellipse 80% 40% at 50% -5%, rgba(8,104,57,0.07) 0%, transparent 70%)',
            overflow: 'hidden',
        }}>
            <LoadingOverlay open={busy} fullScreen />

            <PageHeader
                title="Quản Lý File Cá Nhân"
                subtitle="File và thư mục chỉ mình bạn thấy được — kéo/thả hoặc tải lên, tổ chức theo thư mục"
                icon={<FolderOpenRoundedIcon />}
            />

            <Paper elevation={0} sx={{ p: 2, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', mb: 2, boxShadow: '0 2px 16px rgba(8,104,57,0.05)', flexShrink: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                    <Tooltip title="Thư mục mới" arrow>
                        <Button size="small" variant="outlined" startIcon={<CreateNewFolderRoundedIcon />} onClick={() => setCreateFolderOpen(true)}
                            sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700, borderColor: BORDER, color: '#475569' }}>
                            Thư mục mới
                        </Button>
                    </Tooltip>
                    <input ref={fileInputRef} type="file" multiple hidden onChange={e => handleUploadFiles(e.target.files)} />
                    <Button size="small" variant="contained" startIcon={<UploadFileRoundedIcon />} onClick={() => fileInputRef.current?.click()} disabled={uploading}
                        sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700, bgcolor: GREEN, '&:hover': { bgcolor: '#065f2d' } }}>
                        Tải lên
                    </Button>
                    <Box sx={{ flex: 1 }} />
                    {clipboard && (
                        <Typography sx={{ fontSize: 12.5, color: GREEN, fontWeight: 700, mr: 0.5 }}>
                            {clipboard.mode === 'copy' ? 'Đã sao chép' : 'Đã cắt'} {clipboard.folderIds.length + clipboard.fileIds.length} mục
                        </Typography>
                    )}
                    {hasSelection && (
                        <Typography sx={{ fontSize: 12.5, color: '#64748b', fontWeight: 700, mr: 0.5 }}>
                            Đã chọn {selectedKeys.size}
                        </Typography>
                    )}
                    <Tooltip title={hasSelection ? 'Sao chép (Ctrl+C)' : 'Chọn mục để sao chép'} arrow>
                        <span>
                            <IconButton size="small" disabled={!hasSelection} onClick={() => setClipboard({ mode: 'copy', ...selectionIds() })}
                                sx={{ border: `1px solid ${BORDER}`, borderRadius: '10px' }}>
                                <ContentCopyRoundedIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title={hasSelection ? 'Cắt (Ctrl+X)' : 'Chọn mục để cắt'} arrow>
                        <span>
                            <IconButton size="small" disabled={!hasSelection} onClick={() => setClipboard({ mode: 'cut', ...selectionIds() })}
                                sx={{ border: `1px solid ${BORDER}`, borderRadius: '10px' }}>
                                <ContentCutRoundedIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title={clipboard ? 'Dán (Ctrl+V)' : 'Chưa có gì để dán'} arrow>
                        <span>
                            <IconButton size="small" disabled={!clipboard} onClick={handlePaste}
                                sx={{ border: `1px solid ${BORDER}`, borderRadius: '10px' }}>
                                <ContentPasteRoundedIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title={selectedKeys.size === 1 ? 'Đổi tên (F2)' : 'Chọn 1 mục để đổi tên'} arrow>
                        <span>
                            <IconButton size="small" disabled={selectedKeys.size !== 1} onClick={openRename}
                                sx={{ border: `1px solid ${BORDER}`, borderRadius: '10px' }}>
                                <DriveFileRenameOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    {singleSelectedFile && (
                        <Tooltip title="Tải xuống" arrow>
                            <IconButton size="small" component="a" href={personalFileDownloadUrl(singleSelectedFile.id)}
                                sx={{ border: `1px solid ${BORDER}`, borderRadius: '10px' }}>
                                <UploadFileRoundedIcon fontSize="small" sx={{ transform: 'rotate(180deg)' }} />
                            </IconButton>
                        </Tooltip>
                    )}
                    <Tooltip title={hasSelection ? 'Xóa (Delete)' : 'Chọn mục để xóa'} arrow>
                        <span>
                            <IconButton size="small" disabled={!hasSelection} onClick={() => setDeleteConfirmOpen(true)}
                                sx={{ border: `1px solid ${BORDER}`, borderRadius: '10px', color: hasSelection ? '#dc2626' : undefined }}>
                                <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Thùng rác" arrow>
                        <IconButton size="small" onClick={openTrash}
                            sx={{ border: `1px solid ${BORDER}`, borderRadius: '10px' }}>
                            <DeleteSweepRoundedIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <ToggleButtonGroup size="small" value={viewMode} exclusive
                        onChange={(_, v) => { if (v) setViewMode(v); }}
                        sx={{ '& .MuiToggleButton-root': { border: `1px solid ${BORDER}`, px: 1, '&.Mui-selected': { bgcolor: 'rgba(8,104,57,0.1)', color: GREEN } } }}>
                        <ToggleButton value="grid" sx={{ borderRadius: '10px 0 0 10px !important' }}>
                            <Tooltip title="Dạng lưới" arrow><GridViewRoundedIcon fontSize="small" /></Tooltip>
                        </ToggleButton>
                        <ToggleButton value="list" sx={{ borderRadius: '0 10px 10px 0 !important' }}>
                            <Tooltip title="Dạng danh sách" arrow><ViewListRoundedIcon fontSize="small" /></Tooltip>
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {uploading && (
                    <Box sx={{ mb: 1.5 }}>
                        <Typography sx={{ fontSize: 12, color: '#64748b', mb: 0.5 }}>Đang tải lên... {uploadProgress}%</Typography>
                        <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 6, borderRadius: 99, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: GREEN, borderRadius: 99 } }} />
                    </Box>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <TextField
                        inputRef={searchInputRef}
                        size="small"
                        placeholder="Tìm kiếm (Ctrl+F)"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        sx={{ width: 220, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 13 } }}
                        slotProps={{
                            input: {
                                startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment>,
                                endAdornment: searchQuery ? (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setSearchQuery('')}>
                                            <ClearRoundedIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </InputAdornment>
                                ) : undefined,
                            },
                        }}
                    />
                    {!debouncedSearch && (
                        <Breadcrumbs separator="/" sx={{ fontSize: 13 }}>
                            <MuiLink component="button" underline="hover" onClick={() => openFolder(null)}
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 13, fontWeight: currentFolderId === null ? 800 : 600, color: currentFolderId === null ? GREEN : '#64748b' }}>
                                <HomeRoundedIcon sx={{ fontSize: 16 }} /> Gốc
                            </MuiLink>
                            {breadcrumb.map((b, i) => (
                                <MuiLink key={b.id} component="button" underline="hover" onClick={() => openFolder(b.id)}
                                    sx={{ fontSize: 13, fontWeight: i === breadcrumb.length - 1 ? 800 : 600, color: i === breadcrumb.length - 1 ? GREEN : '#64748b' }}>
                                    {b.name}
                                </MuiLink>
                            ))}
                        </Breadcrumbs>
                    )}
                    {debouncedSearch && (
                        <Typography sx={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>
                            Kết quả tìm kiếm cho &quot;{debouncedSearch}&quot; — {orderedItems.length} mục
                        </Typography>
                    )}
                </Box>
            </Paper>

            <Paper elevation={0}
                tabIndex={0}
                onKeyDown={onGridKeyDown}
                onClick={e => { if (e.target === e.currentTarget) clearSelection(); }}
                onContextMenu={e => { if (e.target === e.currentTarget) onBackgroundContextMenu(e); }}
                sx={{
                    borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)',
                    flex: 1, minHeight: 0, overflow: 'auto', p: 2, outline: 'none',
                    '&:focus-visible': { boxShadow: `0 0 0 2px ${GREEN}` },
                }}>
                {isLoading ? (
                    <Typography sx={{ textAlign: 'center', color: '#94a3b8', py: 6 }}>Đang tải...</Typography>
                ) : folders.length === 0 && files.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 8 }} onContextMenu={onBackgroundContextMenu}>
                        <FolderOpenRoundedIcon sx={{ fontSize: 56, color: '#cbd5e1' }} />
                        <Typography sx={{ color: '#94a3b8', fontSize: 14, mt: 1 }}>Thư mục trống — tải file lên hoặc tạo thư mục mới</Typography>
                    </Box>
                ) : (
                    <>
                        {viewMode === 'list' && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 0.75, mb: 0.5, borderBottom: `1px solid ${BORDER}` }}>
                                <Box sx={{ width: 28, flexShrink: 0 }} />
                                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#94a3b8', flex: 1 }}>Tên</Typography>
                                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#94a3b8', width: 90, textAlign: 'right', flexShrink: 0 }}>Kích thước</Typography>
                                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#94a3b8', width: 140, textAlign: 'right', flexShrink: 0 }}>Sửa đổi</Typography>
                            </Box>
                        )}
                        <Box ref={gridRef} onClick={e => { if (e.target === e.currentTarget) clearSelection(); }}
                            onContextMenu={e => { if (e.target === e.currentTarget) onBackgroundContextMenu(e); }}
                            sx={viewMode === 'grid'
                                ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 1.5 }
                                : { display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                            {orderedItems.map(item => {
                                const f = item.type === 'file' ? files.find(x => x.id === item.id) : undefined;
                                const folderObj = item.type === 'folder' ? folders.find(x => x.id === item.id) : undefined;
                                const modifiedAt = item.type === 'folder' ? (folderObj?.updatedAt ?? folderObj?.createdAt) : (f?.updatedAt ?? f?.createdAt);
                                const icon = item.type === 'folder'
                                    ? <FolderRoundedIcon sx={{ fontSize: viewMode === 'grid' ? 40 : 22, color: '#fbbf24' }} />
                                    : fileIcon(f?.mimeType, viewMode === 'grid' ? 40 : 22);
                                return viewMode === 'grid' ? (
                                    <ItemCard key={item.key} dataKey={item.key} name={item.name} sub={f ? fmtSize(f.fileSize) : undefined}
                                        icon={icon}
                                        selected={selectedKeys.has(item.key)}
                                        focused={focusedKey === item.key}
                                        dimmed={cutKeys.has(item.key)}
                                        onClick={e => onItemClick(e, item)}
                                        onDoubleClick={() => openItem(item)}
                                        onContextMenu={e => onItemContextMenu(e, item)}
                                    />
                                ) : (
                                    <ItemRow key={item.key} dataKey={item.key} name={item.name} sub={f ? fmtSize(f.fileSize) : undefined}
                                        modifiedAt={fmtDate(modifiedAt)}
                                        icon={icon}
                                        selected={selectedKeys.has(item.key)}
                                        focused={focusedKey === item.key}
                                        dimmed={cutKeys.has(item.key)}
                                        onClick={e => onItemClick(e, item)}
                                        onDoubleClick={() => openItem(item)}
                                        onContextMenu={e => onItemContextMenu(e, item)}
                                    />
                                );
                            })}
                        </Box>
                    </>
                )}
            </Paper>

            <Menu
                open={!!contextMenu}
                onClose={closeContextMenu}
                anchorReference="anchorPosition"
                anchorPosition={contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
                slotProps={{ paper: { sx: { borderRadius: '12px', minWidth: 200 } } }}
            >
                {menuActions.map(a => (
                    <MenuItem key={a.key} disabled={a.disabled} onClick={() => { closeContextMenu(); a.onClick(); }}
                        sx={{ fontSize: 13.5, gap: 0.5, color: a.danger ? '#dc2626' : undefined }}>
                        <ListItemIcon sx={{ minWidth: 30, color: a.danger ? '#dc2626' : undefined }}>{a.icon}</ListItemIcon>
                        <ListItemText>{a.label}</ListItemText>
                    </MenuItem>
                ))}
            </Menu>

            <Dialog open={createFolderOpen} onClose={() => setCreateFolderOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>Tạo thư mục mới</DialogTitle>
                <DialogContent>
                    <TextField autoFocus fullWidth size="small" label="Tên thư mục" value={newFolderName}
                        onChange={e => setNewFolderName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); }}
                        sx={{ mt: 1 }} />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setCreateFolderOpen(false)} sx={{ textTransform: 'none', color: '#64748b' }}>Hủy</Button>
                    <Button variant="contained" onClick={handleCreateFolder} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', bgcolor: GREEN, '&:hover': { bgcolor: '#065f2d' } }}>Tạo</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={!!renameTarget} onClose={() => setRenameTarget(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>Đổi tên</DialogTitle>
                <DialogContent>
                    <TextField autoFocus fullWidth size="small" label="Tên mới" value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRenameConfirm(); }}
                        sx={{ mt: 1 }} />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setRenameTarget(null)} sx={{ textTransform: 'none', color: '#64748b' }}>Hủy</Button>
                    <Button variant="contained" onClick={handleRenameConfirm} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', bgcolor: GREEN, '&:hover': { bgcolor: '#065f2d' } }}>Lưu</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>Xác nhận xóa</DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: 14, color: '#475569' }}>
                        {selectedKeys.size > 1 ? `${selectedKeys.size} mục đã chọn` : 'Mục đã chọn'} sẽ chuyển vào Thùng rác, có thể khôi phục lại sau.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button fullWidth variant="outlined" onClick={() => setDeleteConfirmOpen(false)} sx={{ textTransform: 'none', borderRadius: '10px', borderColor: BORDER, color: '#64748b' }}>Hủy</Button>
                    <Button fullWidth variant="contained" color="error" onClick={handleDeleteConfirm} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Xóa</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={trashOpen} onClose={() => setTrashOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS, maxHeight: '80vh' } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    Thùng rác
                    {trashItems.length > 0 && (
                        <Button size="small" onClick={toggleTrashSelectAll} sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700 }}>
                            {trashSelected.size === trashItems.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </Button>
                    )}
                </DialogTitle>
                <DialogContent dividers sx={{ p: 0 }}>
                    {trashLoading ? (
                        <Typography sx={{ textAlign: 'center', color: '#94a3b8', py: 4 }}>Đang tải...</Typography>
                    ) : trashItems.length === 0 ? (
                        <Typography sx={{ textAlign: 'center', color: '#94a3b8', py: 4 }}>Thùng rác trống</Typography>
                    ) : (
                        <List dense>
                            {trashItems.map(item => {
                                const k = trashKeyOf(item);
                                return (
                                    <ListItem key={k} disablePadding>
                                        <ListItemButton onClick={() => toggleTrashSelect(item)} sx={{ py: 0.5 }}>
                                            <Checkbox size="small" edge="start" checked={trashSelected.has(k)} tabIndex={-1} disableRipple sx={{ mr: 0.5 }} />
                                            <ListItemIcon sx={{ minWidth: 32 }}>
                                                {item.isFolder ? <FolderRoundedIcon sx={{ color: '#fbbf24' }} /> : <InsertDriveFileRoundedIcon sx={{ color: '#94a3b8' }} />}
                                            </ListItemIcon>
                                            <ListItemText primary={item.name}
                                                secondary={item.deletedAt ? `Đã xóa lúc ${new Date(item.deletedAt).toLocaleString('vi-VN')}` : undefined}
                                                slotProps={{ primary: { sx: { fontSize: 13.5, fontWeight: 600 } }, secondary: { sx: { fontSize: 11.5 } } }} />
                                        </ListItemButton>
                                    </ListItem>
                                );
                            })}
                        </List>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
                    <Typography sx={{ fontSize: 12, color: '#64748b', flex: 1 }}>
                        {trashSelected.size > 0 ? `Đã chọn ${trashSelected.size}` : ''}
                    </Typography>
                    <Button variant="outlined" disabled={trashSelected.size === 0} startIcon={<RestoreFromTrashRoundedIcon />} onClick={handleTrashRestore}
                        sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700, borderColor: BORDER, color: GREEN }}>
                        Khôi phục
                    </Button>
                    <Button variant="contained" color="error" disabled={trashSelected.size === 0} startIcon={<DeleteForeverRoundedIcon />} onClick={() => setPermanentDeleteConfirmOpen(true)}
                        sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700 }}>
                        Xóa vĩnh viễn
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={permanentDeleteConfirmOpen} onClose={() => setPermanentDeleteConfirmOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>Xóa vĩnh viễn?</DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: 14, color: '#475569' }}>
                        {trashSelected.size} mục sẽ bị xóa vĩnh viễn, KHÔNG thể khôi phục lại. Bạn có chắc chắn?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button fullWidth variant="outlined" onClick={() => setPermanentDeleteConfirmOpen(false)} sx={{ textTransform: 'none', borderRadius: '10px', borderColor: BORDER, color: '#64748b' }}>Hủy</Button>
                    <Button fullWidth variant="contained" color="error" onClick={handleTrashPermanentDeleteConfirm} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Xóa vĩnh viễn</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

function ItemCard({ dataKey, name, sub, icon, selected, focused, dimmed, onClick, onDoubleClick, onContextMenu }: {
    dataKey: string; name: string; sub?: string; icon: React.ReactNode; selected: boolean; focused: boolean; dimmed?: boolean;
    onClick: (e: React.MouseEvent) => void; onDoubleClick: () => void; onContextMenu?: (e: React.MouseEvent) => void;
}) {
    return (
        <Box
            data-key={dataKey}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onContextMenu={onContextMenu}
            sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5,
                p: 1.5, borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
                border: `1px solid ${selected ? GREEN : (focused ? '#94a3b8' : 'transparent')}`,
                bgcolor: selected ? 'rgba(8,104,57,0.08)' : 'transparent',
                opacity: dimmed ? 0.45 : 1,
                '&:hover': { bgcolor: selected ? 'rgba(8,104,57,0.1)' : '#f8fafc' },
                userSelect: 'none',
            }}
        >
            {icon}
            <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#334155', wordBreak: 'break-word', lineHeight: 1.3 }}>
                {name}
            </Typography>
            {sub && <Typography sx={{ fontSize: 10, color: '#94a3b8' }}>{sub}</Typography>}
        </Box>
    );
}

function ItemRow({ dataKey, name, sub, modifiedAt, icon, selected, focused, dimmed, onClick, onDoubleClick, onContextMenu }: {
    dataKey: string; name: string; sub?: string; modifiedAt?: string; icon: React.ReactNode; selected: boolean; focused: boolean; dimmed?: boolean;
    onClick: (e: React.MouseEvent) => void; onDoubleClick: () => void; onContextMenu?: (e: React.MouseEvent) => void;
}) {
    return (
        <Box
            data-key={dataKey}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onContextMenu={onContextMenu}
            sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                px: 1.5, py: 0.75, borderRadius: '8px', cursor: 'pointer',
                border: `1px solid ${selected ? GREEN : (focused ? '#94a3b8' : 'transparent')}`,
                bgcolor: selected ? 'rgba(8,104,57,0.08)' : 'transparent',
                opacity: dimmed ? 0.45 : 1,
                '&:hover': { bgcolor: selected ? 'rgba(8,104,57,0.1)' : '#f8fafc' },
                userSelect: 'none',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, flexShrink: 0 }}>{icon}</Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#334155', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#94a3b8', width: 90, textAlign: 'right', flexShrink: 0 }}>
                {sub || ''}
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#94a3b8', width: 140, textAlign: 'right', flexShrink: 0 }}>
                {modifiedAt || ''}
            </Typography>
        </Box>
    );
}
