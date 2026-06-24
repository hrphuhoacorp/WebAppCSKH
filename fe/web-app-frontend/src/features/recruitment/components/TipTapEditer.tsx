'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table, TableHeader } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
// --- IMPORT THÊM THẰNG NÀY ---

import { Box, Button, ButtonGroup } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatStrikethroughIcon from '@mui/icons-material/FormatStrikethrough';

interface TipTapEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function TipTapEditor({ value, onChange }: TipTapEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Table.configure({
                resizable: false,
            }),
            TableRow,
            TableCell,
            // --- KHAI BÁO THÊM VÀO ĐÂY ---
            TableHeader,
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value, { emitUpdate: false });
        }
    }, [value, editor]);

    if (!editor) return null;

    return (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
            {/* Toolbar */}
            <Box sx={{ p: 0.5, bg: 'grey.50', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 0.5 }}>
                <ButtonGroup size="small" variant="text">
                    <Button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        color={editor.isActive('bold') ? 'primary' : 'inherit'}
                    >
                        <FormatBoldIcon fontSize="small" />
                    </Button>
                    <Button
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        color={editor.isActive('italic') ? 'primary' : 'inherit'}
                    >
                        <FormatItalicIcon fontSize="small" />
                    </Button>
                    <Button
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        color={editor.isActive('strike') ? 'primary' : 'inherit'}
                    >
                        <FormatStrikethroughIcon fontSize="small" />
                    </Button>
                </ButtonGroup>
            </Box>

            {/* Vùng nhập liệu */}
            <Box sx={{
                p: 2,
                minHeight: '300px',
                '& .tiptap': {
                    outline: 'none',
                    minHeight: '280px',
                    fontFamily: 'Roboto, sans-serif',
                    fontSize: '14px',
                },
                '& .tiptap p': { my: 0.5 },
                '& .tiptap table': {
                    borderCollapse: 'collapse',
                    tableLayout: 'fixed',
                    width: '100%',
                    margin: '0',
                    overflow: 'hidden',
                },
                '& .tiptap td, & .tiptap th': {
                    minWidth: '1em',
                    position: 'relative',
                    verticalAlign: 'top',
                }
            }}>
                <EditorContent editor={editor} />
            </Box>
        </Box>
    );
}