'use client';

import { useState } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { xntApi } from '../api/xnt.api';
import {
    buildXntChatReply, chatContextLabel, EMPTY_CHAT_STATE,
    type AdviceCard, type ChatState,
} from '../utils/chatAssistant';

const TONE_STYLES: Record<AdviceCard['tone'], { bg: string; border: string; head: string }> = {
    info: { bg: '#eff6ff', border: '#bfdbfe', head: '#1e40af' },
    warn: { bg: '#fffbeb', border: '#fde68a', head: '#92400e' },
    ok: { bg: '#f0fdf4', border: '#bbf7d0', head: '#166534' },
    error: { bg: '#fef2f2', border: '#fecaca', head: '#991b1b' },
};

// Render **bold** markers thành <b> qua JSX — không dùng dangerouslySetInnerHTML.
function BoldText({ text }: { text: string }) {
    const parts = text.split('**');
    return (
        <>
            {parts.map((part, i) => (i % 2 === 1 ? <b key={i}>{part}</b> : <span key={i}>{part}</span>))}
        </>
    );
}

function ChatCard({ card }: { card: AdviceCard }) {
    const t = TONE_STYLES[card.tone];
    // Card "nối tiếp" (gợi ý trả lời đúng/không phải) không có title/icon — render gọn hơn.
    if (!card.title) {
        return (
            <Typography sx={{ fontSize: 11.5, color: '#94a3b8', mt: -0.5, mb: 1, ml: 0.5 }}>
                <BoldText text={card.bullets[0]} />
            </Typography>
        );
    }
    return (
        <Box sx={{ border: `1px solid ${t.border}`, bgcolor: t.bg, borderRadius: '12px', p: '12px 14px', mb: 1.25 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 13.5, color: t.head, mb: 0.75 }}>
                {card.icon} {card.title}
            </Typography>
            {card.bullets.length === 1 ? (
                <Typography sx={{ fontSize: 12.5, lineHeight: 1.7, color: '#334155' }}>
                    <BoldText text={card.bullets[0]} />
                </Typography>
            ) : (
                <Box component="ul" sx={{ m: '6px 0', pl: '20px', fontSize: 12.5, lineHeight: 1.7, color: '#334155' }}>
                    {card.bullets.map((b, i) => (
                        <li key={i}><BoldText text={b} /></li>
                    ))}
                </Box>
            )}
        </Box>
    );
}

type ChatMessage = { role: 'user' | 'assistant'; text?: string; cards?: AdviceCard[] };

const GREETING: ChatMessage = {
    role: 'assistant',
    cards: [{
        title: '', icon: '', tone: 'info',
        bullets: ['Chào bạn 👋 Mô tả vấn đề đang gặp (vd: "H1144 Phú Lợi hôm nay bị lệch", "khách đã lấy hàng nhưng Sapo chưa lên đơn"), mình sẽ đối chiếu đúng số liệu và luồng của hệ thống để gợi ý hướng xử lý.'],
    }],
};

export default function XntChatAssistant() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
    const [chatState, setChatState] = useState<ChatState>(EMPTY_CHAT_STATE);
    const [input, setInput] = useState('');

    // Dùng lại đúng query key với các tab khác (Sai mã, Sửa SL, Sapo treo) — react-query tự cache
    // chung, không fetch thêm nếu đã có sẵn dữ liệu mới.
    const rowsQuery = useQuery({ queryKey: ['xnt-all-active-rows'], queryFn: () => xntApi.getOverview({}) });
    const sapoPendingQuery = useQuery({ queryKey: ['xnt-sapo-pending-list'], queryFn: () => xntApi.getSapoPendingList() });

    const handleSend = () => {
        const text = input.trim();
        if (!text) return;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text }]);

        const rows = rowsQuery.data?.content ?? [];
        const sapoPending = sapoPendingQuery.data?.content ?? [];
        const { cards, nextState } = buildXntChatReply(text, chatState, rows, sapoPending);
        setChatState(nextState);
        setMessages(prev => [...prev, { role: 'assistant', cards }]);
    };

    const contextLabel = chatContextLabel(chatState.context);

    return (
        <>
            {!open && (
                <Box
                    component="button"
                    onClick={() => setOpen(true)}
                    title="Trợ lý phân tích XNT"
                    sx={{
                        position: 'fixed', right: 22, bottom: 22, width: 56, height: 56, borderRadius: '50%',
                        bgcolor: '#086839', color: '#fff', border: 'none', boxShadow: '0 10px 28px rgba(8,104,57,.35)',
                        cursor: 'pointer', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300,
                    }}
                >
                    🔎
                </Box>
            )}

            {open && (
                <Box sx={{
                    position: 'fixed', right: 22, bottom: 22, width: 380, maxWidth: '92vw', height: 540, maxHeight: '80vh',
                    bgcolor: '#fff', borderRadius: '18px', boxShadow: '0 24px 60px rgba(0,0,0,.22)', zIndex: 1300,
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}>
                    <Box sx={{ bgcolor: '#086839', color: '#fff', p: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                        <Box>
                            <Typography sx={{ fontWeight: 800, fontSize: 14 }}>🔎 Trợ lý phân tích XNT</Typography>
                            <Typography sx={{ fontSize: 11, opacity: 0.85, mt: 0.25 }}>Đối chiếu đúng dữ liệu &amp; luồng hệ thống</Typography>
                        </Box>
                        <IconButton size="small" onClick={() => setOpen(false)} sx={{ bgcolor: 'rgba(255,255,255,.15)', color: '#fff', width: 28, height: 28, borderRadius: '8px', '&:hover': { bgcolor: 'rgba(255,255,255,.25)' } }}>
                            ─
                        </IconButton>
                    </Box>

                    {contextLabel && (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, bgcolor: '#f0fdf4', borderBottom: '1px solid #d1fae5', color: '#166534', fontSize: 11.5, fontWeight: 700, px: 1.5, py: 0.75, flexShrink: 0 }}>
                            <span>🧭 Đang xem: <b>{contextLabel}</b></span>
                            <Box component="span" onClick={() => setChatState(s => ({ ...s, context: { closeDate: '', branch: '', itemCode: '' } }))} sx={{ cursor: 'pointer', fontWeight: 800, px: '2px' }} title="Bỏ ngữ cảnh">✕</Box>
                        </Box>
                    )}

                    <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5, bgcolor: '#fafafa' }}>
                        {messages.map((m, i) => (
                            <Box key={i} sx={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', mb: 1.25 }}>
                                {m.role === 'user' ? (
                                    <Box sx={{ maxWidth: '88%', bgcolor: '#086839', color: '#fff', borderRadius: '14px', borderBottomRightRadius: '4px', p: '9px 12px', fontSize: 12.5, lineHeight: 1.6 }}>
                                        {m.text}
                                    </Box>
                                ) : (
                                    <Box sx={{ maxWidth: '92%', width: '100%' }}>
                                        {m.cards?.map((c, j) => <ChatCard key={j} card={c} />)}
                                    </Box>
                                )}
                            </Box>
                        ))}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, p: '10px 12px', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
                        <Box
                            component="input"
                            placeholder="Nhập vấn đề..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
                            sx={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '10px', px: '10px', py: '8px', fontSize: 12.5, fontFamily: 'inherit', outline: 'none' }}
                        />
                        <Box
                            component="button"
                            onClick={handleSend}
                            sx={{ bgcolor: '#086839', color: '#fff', border: 'none', borderRadius: '10px', px: '14px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}
                        >
                            Gửi
                        </Box>
                    </Box>
                </Box>
            )}
        </>
    );
}
