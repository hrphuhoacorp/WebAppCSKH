'use client';

import { Box, Chip, Typography, alpha } from "@mui/material";
import { PROMO_FRAMES, recommendFrame } from "../promoFrames";
import { GREEN } from "../styles";

interface Props {
    frameId: string;
    cardCount: number;
    onFrameChange: (id: string) => void;
}

export default function PromoFrameSelector({ frameId, cardCount, onFrameChange }: Props) {
    const recommended = recommendFrame(cardCount);

    return (
        <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#334155', mb: 1.5 }}>Khung sắp xếp trang in</Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                {PROMO_FRAMES.map((frame) => {
                    const selected = frame.id === frameId;
                    const isRecommended = frame.id === recommended.id;
                    return (
                        <Box
                            key={frame.id}
                            onClick={() => onFrameChange(frame.id)}
                            sx={{
                                cursor: 'pointer',
                                border: `2px solid ${selected ? GREEN : '#e2e8f0'}`,
                                borderRadius: '12px',
                                p: 1.25,
                                bgcolor: selected ? alpha(GREEN, 0.06) : '#fff',
                                position: 'relative',
                                transition: 'all .15s',
                                '&:hover': { borderColor: GREEN },
                            }}
                        >
                            {isRecommended && (
                                <Chip
                                    label="Đề xuất"
                                    size="small"
                                    sx={{ position: 'absolute', top: -10, right: 8, height: 18, fontSize: 9, fontWeight: 800, bgcolor: '#fef3c7', color: '#b45309' }}
                                />
                            )}
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${frame.columns}, 1fr)`,
                                    gridTemplateRows: `repeat(${frame.rows}, 1fr)`,
                                    gap: 0.5,
                                    width: '100%',
                                    aspectRatio: frame.pageOrientation === 'portrait' ? '210 / 297' : '297 / 210',
                                    bgcolor: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '4px',
                                    p: 0.5,
                                    mb: 1,
                                }}
                            >
                                {Array.from({ length: frame.cardsPerPage }).map((_, i) => (
                                    <Box key={i} sx={{ bgcolor: selected ? GREEN : '#cbd5e1', borderRadius: '2px' }} />
                                ))}
                            </Box>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: selected ? GREEN : '#475569', textAlign: 'center' }}>
                                {frame.name}
                            </Typography>
                            <Typography sx={{ fontSize: 9.5, color: '#94a3b8', textAlign: 'center', mt: 0.25 }}>
                                Trang {frame.pageOrientation === 'portrait' ? 'dọc' : 'ngang'}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}
