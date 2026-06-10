'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Color from '@tiptap/extension-color';
import { Box, IconButton, Divider, Tooltip } from '@mui/material';
import {
    FormatBold, FormatItalic, FormatUnderlined,
    FormatListBulleted, FormatListNumbered,
    FormatAlignLeft, FormatAlignCenter, FormatAlignRight,
    FormatQuote, Image as ImageIcon, Link as LinkIcon,
    FormatClear, Undo, Redo,
} from '@mui/icons-material';
import { useRef } from 'react';
import { newsApi } from '../api/news.api';
import toast from 'react-hot-toast';
import { TextStyle } from '@tiptap/extension-text-style';

interface NewsEditorProps {
    value: string;
    onChange: (value: string) => void;
}

// Upload file ảnh rồi chèn URL vào vị trí con trỏ (dùng cho paste & kéo-thả)
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

export default function NewsEditor({ value, onChange }: NewsEditorProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            TextStyle,
            Color,
            Image.configure({ inline: false, allowBase64: false }),
            Link.configure({ openOnClick: false }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            // Paste ảnh từ clipboard → upload lên server rồi chèn URL
            handlePaste: (view, event) => {
                const items = event.clipboardData?.items;
                if (!items) return false;
                for (const item of items) {
                    if (item.type.startsWith('image/')) {
                        const file = item.getAsFile();
                        if (file) {
                            event.preventDefault();
                            uploadAndInsertImage(view, file);
                            return true;
                        }
                    }
                }
                return false;
            },
            // Kéo-thả file ảnh vào editor cũng upload luôn
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

    if (!editor) return null;

    const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const tid = toast.loading('Đang upload ảnh...');
        try {
            const response = await newsApi.uploadImage(file);
            const url = response.content;
            editor.chain().focus().setImage({ src: url }).run();
            toast.success('Upload ảnh thành công', { id: tid });
        } catch {
            toast.error('Upload ảnh thất bại', { id: tid });
        } finally {
            e.target.value = '';
        }
    };

    const handleSetLink = () => {
        const url = window.prompt('Nhập URL:');
        if (!url) return;
        editor.chain().focus().setLink({ href: url }).run();
    };

    const btnSx = (active?: boolean) => ({
        width: 32, height: 32, borderRadius: '6px',
        color: active ? '#086839' : '#475569',
        bgcolor: active ? 'rgba(8,104,57,0.1)' : 'transparent',
        '&:hover': { bgcolor: 'rgba(8,104,57,0.08)' },
    });

    return (
        <Box sx={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            {/* ── Toolbar ── */}
            <Box sx={{
                display: 'flex', alignItems: 'center', flexWrap: 'wrap',
                gap: 0.3, px: 1.5, py: 1,
                bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0',
            }}>
                <Tooltip title="Undo"><IconButton size="small" sx={btnSx()} onClick={() => editor.chain().focus().undo().run()}><Undo sx={{ fontSize: 18 }} /></IconButton></Tooltip>
                <Tooltip title="Redo"><IconButton size="small" sx={btnSx()} onClick={() => editor.chain().focus().redo().run()}><Redo sx={{ fontSize: 18 }} /></IconButton></Tooltip>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                <Tooltip title="Bold"><IconButton size="small" sx={btnSx(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()}><FormatBold sx={{ fontSize: 18 }} /></IconButton></Tooltip>
                <Tooltip title="Italic"><IconButton size="small" sx={btnSx(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()}><FormatItalic sx={{ fontSize: 18 }} /></IconButton></Tooltip>
                <Tooltip title="Underline"><IconButton size="small" sx={btnSx(editor.isActive('underline'))} onClick={() => editor.chain().focus().toggleUnderline().run()}><FormatUnderlined sx={{ fontSize: 18 }} /></IconButton></Tooltip>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                <Tooltip title="Căn trái"><IconButton size="small" sx={btnSx(editor.isActive({ textAlign: 'left' }))} onClick={() => editor.chain().focus().setTextAlign('left').run()}><FormatAlignLeft sx={{ fontSize: 18 }} /></IconButton></Tooltip>
                <Tooltip title="Căn giữa"><IconButton size="small" sx={btnSx(editor.isActive({ textAlign: 'center' }))} onClick={() => editor.chain().focus().setTextAlign('center').run()}><FormatAlignCenter sx={{ fontSize: 18 }} /></IconButton></Tooltip>
                <Tooltip title="Căn phải"><IconButton size="small" sx={btnSx(editor.isActive({ textAlign: 'right' }))} onClick={() => editor.chain().focus().setTextAlign('right').run()}><FormatAlignRight sx={{ fontSize: 18 }} /></IconButton></Tooltip>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                <Tooltip title="Danh sách"><IconButton size="small" sx={btnSx(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()}><FormatListBulleted sx={{ fontSize: 18 }} /></IconButton></Tooltip>
                <Tooltip title="Danh sách số"><IconButton size="small" sx={btnSx(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()}><FormatListNumbered sx={{ fontSize: 18 }} /></IconButton></Tooltip>
                <Tooltip title="Trích dẫn"><IconButton size="small" sx={btnSx(editor.isActive('blockquote'))} onClick={() => editor.chain().focus().toggleBlockquote().run()}><FormatQuote sx={{ fontSize: 18 }} /></IconButton></Tooltip>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                <Tooltip title="Chèn ảnh">
                    <IconButton size="small" sx={btnSx()} onClick={() => fileInputRef.current?.click()}>
                        <ImageIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Chèn link"><IconButton size="small" sx={btnSx(editor.isActive('link'))} onClick={handleSetLink}><LinkIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
                <Tooltip title="Xóa định dạng"><IconButton size="small" sx={btnSx()} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}><FormatClear sx={{ fontSize: 18 }} /></IconButton></Tooltip>

                <input ref={fileInputRef} type="file" hidden accept=".jpg,.jpeg,.png,.webp" onChange={handleUploadImage} />
            </Box>

            {/* ── Editor content: giới hạn chiều cao, cuộn bên trong ── */}
            <Box sx={{
                minHeight: 300,
                maxHeight: 'min(480px, 45vh)',
                overflowY: 'auto',
                p: 2,
                cursor: 'text',
                '&::-webkit-scrollbar': { width: 8 },
                '&::-webkit-scrollbar-thumb': {
                    bgcolor: '#cbd5e1', borderRadius: '4px',
                    '&:hover': { bgcolor: '#94a3b8' },
                },
                '& .ProseMirror': {
                    outline: 'none', minHeight: 280,
                    fontSize: 15, lineHeight: 1.7, color: '#1e293b',
                    '& h1': { fontSize: 28, fontWeight: 800, mb: 1 },
                    '& h2': { fontSize: 22, fontWeight: 700, mb: 1 },
                    '& h3': { fontSize: 18, fontWeight: 700, mb: 1 },
                    '& p': { mb: 1 },
                    '& img': { maxWidth: '100%', borderRadius: '8px', my: 1 },
                    '& blockquote': { borderLeft: '3px solid #086839', pl: 2, color: '#475569', fontStyle: 'italic' },
                    '& ul, & ol': { pl: 3 },
                    '& a': { color: '#086839', textDecoration: 'underline' },
                },
            }}>
                <EditorContent editor={editor} onClick={() => editor.chain().focus().run()} />
            </Box>
        </Box>
    );
}