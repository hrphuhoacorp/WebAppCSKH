'use client';

import { useEditor, EditorContent, Node, mergeAttributes } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import { Box, IconButton, Divider, Tooltip, MenuItem, Select } from '@mui/material';
import {
    FormatBold, FormatItalic, FormatUnderlined, StrikethroughS,
    FormatListBulleted, FormatListNumbered,
    FormatAlignLeft, FormatAlignCenter, FormatAlignRight,
    FormatQuote, Image as ImageIcon, Link as LinkIcon,
    FormatClear, Undo, Redo, HorizontalRule,
    ViewWeekRounded,
} from '@mui/icons-material';
import { useRef } from 'react';
import { newsApi } from '../api/news.api';
import toast from 'react-hot-toast';

// ── Custom extension: Callout/Bordered Box ──────────────────────────────────
const CalloutBox = Node.create({
    name: 'calloutBox',
    group: 'block',
    content: 'block+',
    defining: true,
    parseHTML() {
        return [{ tag: 'div[data-callout]' }];
    },
    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-callout': '' }), 0];
    },
    addKeyboardShortcuts() {
        return {};
    },
});

interface NewsEditorProps {
    value: string;
    onChange: (value: string) => void;
}

async function uploadAndInsertImage(view: any, file: File) {
    const tid = toast.loading('Đang upload ảnh...');
    try {
        const response = await newsApi.uploadImage(file);
        const url = response.content;
        const node = view.state.schema.nodes.image.create({ src: url });
        view.dispatch(view.state.tr.replaceSelectionWith(node));
        toast.success('Đã chèn ảnh', { id: tid });
    } catch {
        toast.error('Upload ảnh thất bại', { id: tid });
    }
}

const HEADING_OPTIONS = [
    { value: 'p', label: 'Đoạn văn' },
    { value: '1', label: 'Tiêu đề 1' },
    { value: '2', label: 'Tiêu đề 2' },
    { value: '3', label: 'Tiêu đề 3' },
];

export default function NewsEditor({ value, onChange }: NewsEditorProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const colorInputRef = useRef<HTMLInputElement>(null);
    const highlightInputRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Underline,
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            CalloutBox,
            Image.configure({ inline: false, allowBase64: false }),
            Link.configure({ openOnClick: false }),
            TextAlign.configure({ types: ['heading', 'paragraph', 'calloutBox'] }),
        ],
        content: value,
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
        editorProps: {
            handlePaste: (view, event) => {
                const items = event.clipboardData?.items;
                if (!items) return false;
                for (const item of items) {
                    if (item.type.startsWith('image/')) {
                        const file = item.getAsFile();
                        if (file) { event.preventDefault(); uploadAndInsertImage(view, file); return true; }
                    }
                }
                return false;
            },
            handleDrop: (view, event, _slice, moved) => {
                if (moved) return false;
                const files = event.dataTransfer?.files;
                if (!files?.length) return false;
                const images = Array.from(files).filter(f => f.type.startsWith('image/'));
                if (!images.length) return false;
                event.preventDefault();
                images.forEach(file => uploadAndInsertImage(view, file));
                return true;
            },
        },
    });

    const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editor) return;
        const tid = toast.loading('Đang upload ảnh...');
        try {
            const response = await newsApi.uploadImage(file);
            editor.chain().focus().setImage({ src: response.content }).run();
            toast.success('Upload ảnh thành công', { id: tid });
        } catch {
            toast.error('Upload ảnh thất bại', { id: tid });
        } finally { e.target.value = ''; }
    };

    const handleSetLink = () => {
        const url = window.prompt('Nhập URL:');
        if (!url || !editor) return;
        editor.chain().focus().setLink({ href: url }).run();
    };

    const getHeadingValue = () => {
        if (!editor) return 'p';
        if (editor.isActive('heading', { level: 1 })) return '1';
        if (editor.isActive('heading', { level: 2 })) return '2';
        if (editor.isActive('heading', { level: 3 })) return '3';
        return 'p';
    };

    const setHeading = (val: string) => {
        if (!editor) return;
        if (val === 'p') editor.chain().focus().setParagraph().run();
        else editor.chain().focus().setHeading({ level: Number(val) as 1 | 2 | 3 }).run();
    };

    const btn = (active?: boolean) => ({
        width: 30, height: 30, borderRadius: '6px',
        color: active ? '#086839' : '#475569',
        bgcolor: active ? 'rgba(8,104,57,0.1)' : 'transparent',
        '&:hover': { bgcolor: 'rgba(8,104,57,0.08)' },
    });

    const currentColor = editor?.getAttributes('textStyle')?.color ?? '#000000';
    const currentHighlight = editor?.getAttributes('highlight')?.color ?? '#ffff00';

    return (
        <Box sx={{
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
        }}>
            {/* ── Toolbar (sticky) ── */}
            <Box sx={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                display: 'flex', alignItems: 'center', flexWrap: 'wrap',
                gap: 0.25, px: 1, py: 0.75,
                bgcolor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
                {/* Undo / Redo */}
                <Tooltip title="Hoàn tác"><IconButton size="small" sx={btn()} onClick={() => editor?.chain().focus().undo().run()}><Undo sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                <Tooltip title="Làm lại"><IconButton size="small" sx={btn()} onClick={() => editor?.chain().focus().redo().run()}><Redo sx={{ fontSize: 17 }} /></IconButton></Tooltip>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                {/* Heading dropdown */}
                <Select
                    size="small"
                    value={getHeadingValue()}
                    onChange={e => setHeading(e.target.value)}
                    sx={{
                        height: 30, fontSize: 12, fontWeight: 600,
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
                        '& .MuiSelect-select': { py: 0.4, pl: 1, pr: 2.5 },
                        borderRadius: '6px', minWidth: 100,
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#086839' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#086839' },
                    }}
                >
                    {HEADING_OPTIONS.map(o => (
                        <MenuItem key={o.value} value={o.value} sx={{ fontSize: 13 }}>{o.label}</MenuItem>
                    ))}
                </Select>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                {/* Text formatting */}
                <Tooltip title="In đậm (Ctrl+B)"><IconButton size="small" sx={btn(editor?.isActive('bold'))} onClick={() => editor?.chain().focus().toggleBold().run()}><FormatBold sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                <Tooltip title="In nghiêng (Ctrl+I)"><IconButton size="small" sx={btn(editor?.isActive('italic'))} onClick={() => editor?.chain().focus().toggleItalic().run()}><FormatItalic sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                <Tooltip title="Gạch chân (Ctrl+U)"><IconButton size="small" sx={btn(editor?.isActive('underline'))} onClick={() => editor?.chain().focus().toggleUnderline().run()}><FormatUnderlined sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                <Tooltip title="Gạch ngang"><IconButton size="small" sx={btn(editor?.isActive('strike'))} onClick={() => editor?.chain().focus().toggleStrike().run()}><StrikethroughS sx={{ fontSize: 17 }} /></IconButton></Tooltip>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                {/* Text color */}
                <Tooltip title="Màu chữ">
                    <Box sx={{ position: 'relative', width: 30, height: 30 }}>
                        <IconButton size="small" sx={btn()} onClick={() => colorInputRef.current?.click()}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                <Box sx={{ fontSize: 13, fontWeight: 800, lineHeight: 1, color: '#475569', fontFamily: 'serif' }}>A</Box>
                                <Box sx={{ width: 16, height: 3, borderRadius: '2px', bgcolor: currentColor }} />
                            </Box>
                        </IconButton>
                        <input
                            ref={colorInputRef}
                            type="color"
                            value={currentColor}
                            style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                            onChange={e => editor?.chain().focus().setColor(e.target.value).run()}
                        />
                    </Box>
                </Tooltip>

                {/* Highlight color */}
                <Tooltip title="Màu nền chữ">
                    <Box sx={{ position: 'relative', width: 30, height: 30 }}>
                        <IconButton size="small" sx={btn(editor?.isActive('highlight'))} onClick={() => highlightInputRef.current?.click()}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                <Box sx={{ fontSize: 13, fontWeight: 800, lineHeight: 1, color: '#475569', fontFamily: 'serif' }}>A</Box>
                                <Box sx={{ width: 16, height: 3, borderRadius: '2px', bgcolor: currentHighlight }} />
                            </Box>
                        </IconButton>
                        <input
                            ref={highlightInputRef}
                            type="color"
                            value={currentHighlight}
                            style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                            onChange={e => editor?.chain().focus().setHighlight({ color: e.target.value }).run()}
                        />
                    </Box>
                </Tooltip>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                {/* Alignment */}
                <Tooltip title="Căn trái"><IconButton size="small" sx={btn(editor?.isActive({ textAlign: 'left' }))} onClick={() => editor?.chain().focus().setTextAlign('left').run()}><FormatAlignLeft sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                <Tooltip title="Căn giữa"><IconButton size="small" sx={btn(editor?.isActive({ textAlign: 'center' }))} onClick={() => editor?.chain().focus().setTextAlign('center').run()}><FormatAlignCenter sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                <Tooltip title="Căn phải"><IconButton size="small" sx={btn(editor?.isActive({ textAlign: 'right' }))} onClick={() => editor?.chain().focus().setTextAlign('right').run()}><FormatAlignRight sx={{ fontSize: 17 }} /></IconButton></Tooltip>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                {/* Lists */}
                <Tooltip title="Danh sách chấm"><IconButton size="small" sx={btn(editor?.isActive('bulletList'))} onClick={() => editor?.chain().focus().toggleBulletList().run()}><FormatListBulleted sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                <Tooltip title="Danh sách số"><IconButton size="small" sx={btn(editor?.isActive('orderedList'))} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><FormatListNumbered sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                <Tooltip title="Trích dẫn"><IconButton size="small" sx={btn(editor?.isActive('blockquote'))} onClick={() => editor?.chain().focus().toggleBlockquote().run()}><FormatQuote sx={{ fontSize: 17 }} /></IconButton></Tooltip>

                {/* Kẻ khung (Callout box) */}
                <Tooltip title="Kẻ khung (Hộp nổi bật)">
                    <IconButton
                        size="small"
                        sx={btn(editor?.isActive('calloutBox'))}
                        onClick={() => {
                            if (!editor) return;
                            if (editor.isActive('calloutBox')) {
                                editor.chain().focus().lift('calloutBox').run();
                            } else {
                                editor.chain().focus().wrapIn('calloutBox').run();
                            }
                        }}
                    >
                        <ViewWeekRounded sx={{ fontSize: 17 }} />
                    </IconButton>
                </Tooltip>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                {/* Divider / HR */}
                <Tooltip title="Đường kẻ ngang"><IconButton size="small" sx={btn()} onClick={() => editor?.chain().focus().setHorizontalRule().run()}><HorizontalRule sx={{ fontSize: 17 }} /></IconButton></Tooltip>

                {/* Image / Link / Clear */}
                <Tooltip title="Chèn ảnh"><IconButton size="small" sx={btn()} onClick={() => fileInputRef.current?.click()}><ImageIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                <Tooltip title="Chèn link"><IconButton size="small" sx={btn(editor?.isActive('link'))} onClick={handleSetLink}><LinkIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                <Tooltip title="Xóa định dạng"><IconButton size="small" sx={btn()} onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}><FormatClear sx={{ fontSize: 17 }} /></IconButton></Tooltip>

                <input ref={fileInputRef} type="file" hidden accept=".jpg,.jpeg,.png,.webp" onChange={handleUploadImage} />
            </Box>

            {/* ── Editor content ── */}
            <Box
                onClick={() => editor?.chain().focus().run()}
                sx={{
                    flex: 1,
                    minHeight: 300,
                    maxHeight: 'min(500px, 48vh)',
                    overflowY: 'auto',
                    p: 2,
                    cursor: 'text',
                    '&::-webkit-scrollbar': { width: 6 },
                    '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: '4px', '&:hover': { bgcolor: '#94a3b8' } },
                    '& .ProseMirror': {
                        outline: 'none',
                        minHeight: 280,
                        fontSize: 15, lineHeight: 1.75, color: '#1e293b',
                        '& h1': { fontSize: 26, fontWeight: 800, mt: 1.5, mb: 0.75, color: '#0f172a' },
                        '& h2': { fontSize: 20, fontWeight: 700, mt: 1.5, mb: 0.5, color: '#1e293b' },
                        '& h3': { fontSize: 16, fontWeight: 700, mt: 1, mb: 0.5, color: '#334155' },
                        '& p': { mb: 0.75 },
                        '& img': { maxWidth: '100%', borderRadius: '8px', my: 1 },
                        '& blockquote': {
                            borderLeft: '3px solid #086839',
                            pl: 2, ml: 0,
                            color: '#475569',
                            fontStyle: 'italic',
                            bgcolor: '#f0fdf4',
                            borderRadius: '0 8px 8px 0',
                            py: 0.5,
                        },
                        '& ul, & ol': { pl: 3 },
                        '& a': { color: '#086839', textDecoration: 'underline' },
                        '& hr': { border: 'none', borderTop: '2px solid #e2e8f0', my: 2 },
                        '& mark': { borderRadius: '3px', px: '2px' },
                        '& div[data-callout]': {
                            border: '1.5px solid #cbd5e1',
                            borderLeft: '4px solid #086839',
                            borderRadius: '8px',
                            px: 2, py: 1.5,
                            bgcolor: '#f8fafc',
                            my: 1.5,
                        },
                    },
                }}
            >
                <EditorContent editor={editor} />
            </Box>
        </Box>
    );
}
