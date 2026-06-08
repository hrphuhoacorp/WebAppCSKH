'use client';

import { useState } from 'react';
import {
    Box,
    Collapse,
    IconButton,
    List,
    ListItemButton,
    ListItemText,
    Typography,
    Tooltip,
} from '@mui/material';
import {
    ExpandLess,
    ExpandMore,
    FolderRounded,
    FolderOpenRounded,
    ChevronRight,
    DeleteOutlined,
} from '@mui/icons-material';
import { MediaFolderDto } from '../schemas/media_folder.schemas';

interface FolderTreeProps {
    folders: MediaFolderDto[];
    selectedFolderId: number | null;
    onSelect: (id: number | null) => void;
    onDeleteFolder?: (folder: MediaFolderDto) => void; // Thêm prop mới
}

export default function FolderTree({
    folders,
    selectedFolderId,
    onSelect,
    onDeleteFolder
}: FolderTreeProps) {
    const [expanded, setExpanded] = useState<Set<number>>(new Set());

    const toggleExpand = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const renderLevel = (items: MediaFolderDto[], depth: number): React.ReactNode => {
        return items.map((folder, idx) => {
            const hasChildren = folder.children?.length > 0;
            const isOpen = expanded.has(folder.id);
            const isActive = selectedFolderId === folder.id;
            const isLast = idx === items.length - 1;

            return (
                <Box key={folder.id} sx={{ position: 'relative' }}>
                    {depth > 0 && (
                        <>
                            <Box sx={{
                                position: 'absolute',
                                left: (depth - 1) * 20 + 9,
                                top: 0,
                                bottom: isLast ? '50%' : 0,
                                width: '1px',
                                bgcolor: '#d1d5db',
                                zIndex: 0,
                            }} />
                            <Box sx={{
                                position: 'absolute',
                                left: (depth - 1) * 20 + 9,
                                top: 16,
                                width: 12,
                                height: '1px',
                                bgcolor: '#d1d5db',
                                zIndex: 0,
                            }} />
                        </>
                    )}

                    <ListItemButton
                        onClick={() => onSelect(folder.id)}
                        dense
                        sx={{
                            pl: depth * 2.5 + 0.5,
                            pr: 1,
                            py: 0.5,
                            borderRadius: '6px',
                            mb: 0.2,
                            position: 'relative',
                            bgcolor: isActive ? '#e3f2fd' : 'transparent',
                            border: isActive ? '1px solid #90caf9' : '1px solid transparent',
                            '&:hover': {
                                bgcolor: isActive ? '#e3f2fd' : '#f5f5f5',
                                '& .delete-folder-btn': { opacity: 1 } // Hiện nút xóa khi hover
                            },
                        }}
                    >
                        <Box sx={{ width: 16, flexShrink: 0, display: 'flex', alignItems: 'center', mr: 0.5 }}>
                            {hasChildren ? (
                                <IconButton
                                    size="small"
                                    onClick={e => toggleExpand(folder.id, e)}
                                    sx={{ p: 0, width: 16, height: 16, '&:hover': { bgcolor: '#e0e0e0' } }}
                                >
                                    {isOpen ? <ExpandLess sx={{ fontSize: 14 }} /> : <ChevronRight sx={{ fontSize: 14 }} />}
                                </IconButton>
                            ) : null}
                        </Box>

                        <Box sx={{ mr: 0.8, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                            {isOpen || isActive
                                ? <FolderOpenRounded sx={{ fontSize: 18, color: '#ffa726' }} />
                                : <FolderRounded sx={{ fontSize: 18, color: '#ffb74d' }} />}
                        </Box>

                        <ListItemText
                            primary={folder.name}
                            slotProps={{
                                primary: {
                                    sx: {
                                        fontSize: 13,
                                        fontWeight: isActive ? 700 : 500,
                                        color: isActive ? '#1565c0' : '#37474f',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }
                                }
                            }}
                        />

                        {/* Số lượng file */}
                        <Typography sx={{
                            fontSize: 11,
                            color: '#90a4ae',
                            fontWeight: 600,
                            ml: 0.5,
                            flexShrink: 0,
                            mr: 0.5
                        }}>
                            {folder.count ?? 0}
                        </Typography>

                        {/* Nút xóa thư mục */}
                        {onDeleteFolder && (
                            <Tooltip title="Xóa thư mục" arrow>
                                <IconButton
                                    className="delete-folder-btn"
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteFolder(folder);
                                    }}
                                    sx={{
                                        opacity: 0,
                                        p: 0.3,
                                        color: '#ef5350',
                                        '&:hover': {
                                            bgcolor: '#ffebee',
                                            color: '#f44336'
                                        },
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    <DeleteOutlined sx={{ fontSize: 15 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </ListItemButton>

                    {hasChildren && (
                        <Collapse in={isOpen} timeout={200} unmountOnExit>
                            <Box sx={{ position: 'relative' }}>
                                {renderLevel(folder.children, depth + 1)}
                            </Box>
                        </Collapse>
                    )}
                </Box>
            );
        });
    };

    return (
        <List component="div" disablePadding sx={{ px: 0.5 }}>
            {/* All folders */}
            <ListItemButton
                onClick={() => onSelect(null)}
                dense
                sx={{
                    pl: 0.5,
                    pr: 1,
                    py: 0.5,
                    borderRadius: '6px',
                    mb: 0.2,
                    bgcolor: selectedFolderId === null ? '#e3f2fd' : 'transparent',
                    border: selectedFolderId === null ? '1px solid #90caf9' : '1px solid transparent',
                    '&:hover': { bgcolor: selectedFolderId === null ? '#e3f2fd' : '#f5f5f5' },
                }}
            >
                <Box sx={{ mr: 0.8, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <FolderRounded sx={{ fontSize: 18, color: '#66bb6a' }} />
                </Box>
                <ListItemText
                    primary="Tất cả thư mục"
                    slotProps={{
                        primary: {
                            sx: {
                                fontSize: 13,
                                fontWeight: selectedFolderId === null ? 700 : 500,
                                color: selectedFolderId === null ? '#1565c0' : '#37474f',
                            }
                        }
                    }}
                />
            </ListItemButton>
            {renderLevel(folders, 0)}
        </List>
    );
}