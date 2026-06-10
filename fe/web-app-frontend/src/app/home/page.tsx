'use client';

import { useEffect, useState } from 'react';
import {
  Box, Typography, Divider, CircularProgress, IconButton, InputBase,
  Pagination,
} from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { newsApi } from '@/features/news/api/news.api';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { NewsItem, TYPE_LABEL, excerpt } from '@/features/news/news.shared';
import { TypeTag, Meta, FeedRow, CategoryPill } from '@/features/news/components/NewsBits';

export default function HomePage() {
  const router = useRouter();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const searchParams = useSearchParams();
  const [category, setCategory] = useState(searchParams.get('category') ?? 'all');

  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [totalItems, setTotalItems] = useState(0);
  const totalPages = Math.ceil(totalItems / pageSize);

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setCategory(cat);
  }, [searchParams]);
  useEffect(() => {
    newsApi.getPaged({ status: 'published', pageSize, page })
      .then(res => {
        setNews(res.content.items);
        setTotalItems(res.content.totalItems);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [page,pageSize]);

  const openDetail = (item: NewsItem) => router.push(`/home/${item.id}`);

  // Lọc client-side theo từ khóa + danh mục
  const q = search.trim().toLowerCase();
  const filtering = category !== 'all' || q !== '';
  const visible = news.filter(n => {
    const matchCat = category === 'all' || n.type === category;
    const matchSearch = !q
      || n.title.toLowerCase().includes(q)
      || excerpt(n.content, 100000).toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const pinned = visible.filter(n => n.isPinned);
  const rest = visible.filter(n => !n.isPinned);
  const lead = pinned[0] ?? rest[0];
  const subPinned = pinned.slice(1);
  const feed = pinned[0] ? rest : rest.slice(1);

  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  if (loading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 20 }}>
        <CircularProgress size={32} sx={{ color: '#086839' }} />
      </Box>
    );
  }

  return (
    <>
      {/* ── Mast: tiêu đề trang kiểu măng-sét báo ── */}
      <Box sx={{ px: { xs: 2.5, md: 6, lg: 10 }, pt: { xs: 4, md: 6 }, pb: { xs: 3, md: 4 } }}>
        <Typography sx={{
          fontSize: 12.5,
          fontWeight: 600,
          color: '#94a3b8',
          mb: 1,
          textTransform: 'capitalize',
        }}>
          {today}
        </Typography>
        <Typography component="h1" sx={{
          fontWeight: 900,
          fontSize: { xs: 34, md: 52 },
          letterSpacing: '-0.03em',
          lineHeight: 1.05,
          color: '#0f172a',
        }}>
          <Box component="span" sx={{ color: '#086839' }}>BẢNG TIN </Box>
          NỘI BỘ{' '}
        </Typography>
        <Divider sx={{ mt: { xs: 3, md: 4 }, borderColor: '#0f172a', borderBottomWidth: 2 }} />

        {/* ── Thanh lọc: danh mục + tìm kiếm ── */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          mt: { xs: 2, md: 2.5 },
          flexWrap: { xs: 'wrap', md: 'nowrap' },
        }}>
          <Box sx={{
            display: 'flex',
            gap: 1,
            overflowX: 'auto',
            flex: 1,
            minWidth: 0,
            pb: 0.5,
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}>
            <CategoryPill label="Tất cả" active={category === 'all'} onClick={() => setCategory('all')} />
            {Object.entries(TYPE_LABEL).map(([key, info]) => (
              <CategoryPill key={key} label={info.label} active={category === key} onClick={() => setCategory(key)} />
            ))}
          </Box>

          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.8,
            px: 1.8,
            height: 38,
            borderRadius: '999px',
            border: '1px solid rgba(13,43,30,0.15)',
            minWidth: { xs: '100%', md: 280 },
            transition: 'border-color 0.2s',
            '&:focus-within': { borderColor: '#086839' },
          }}>
            <SearchRoundedIcon sx={{ fontSize: 18, color: '#94a3b8', flexShrink: 0 }} />
            <InputBase
              placeholder="Tìm kiếm bài viết..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              sx={{ fontSize: 13.5, flex: 1, color: '#0f172a' }}
            />
            {search && (
              <IconButton size="small" onClick={() => setSearch('')} sx={{ p: 0.3 }}>
                <CloseRoundedIcon sx={{ fontSize: 15, color: '#94a3b8' }} />
              </IconButton>
            )}
          </Box>
        </Box>
      </Box>

      {news.length === 0 ? (
        <Box sx={{ px: { xs: 2.5, md: 6, lg: 10 }, py: 12, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 44, mb: 1.5 }}>📭</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 17, color: '#334155' }}>
            Chưa có tin nội bộ nào
          </Typography>
          <Typography sx={{ color: '#94a3b8', fontSize: 14, mt: 0.5 }}>
            Bài viết sẽ xuất hiện ở đây khi được đăng tải
          </Typography>
        </Box>
      ) : filtering ? (
        /* ── Kết quả tìm kiếm / lọc danh mục ── */
        <Box sx={{ px: { xs: 2.5, md: 6, lg: 10 }, pb: { xs: 5, md: 8 } }}>
          {visible.length > 0 ? (
            <>
              <Typography sx={{ fontSize: 13.5, color: '#94a3b8', fontWeight: 600 }}>
                Tìm thấy <Box component="b" sx={{ color: '#086839' }}>{visible.length}</Box> bài viết
              </Typography>
              {visible.map(item => (
                <FeedRow key={item.id} item={item} onClick={() => openDetail(item)} />
              ))}
            </>
          ) : (
            <Box sx={{ py: { xs: 8, md: 12 }, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 40, mb: 1.5 }}>🔍</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#334155' }}>
                Không tìm thấy bài viết phù hợp
              </Typography>
              <Typography sx={{ color: '#94a3b8', fontSize: 14, mt: 0.5 }}>
                Thử từ khóa khác hoặc chọn danh mục khác xem sao
              </Typography>
            </Box>
          )}
        </Box>
      ) : (
        <>
          {/* ── Bài dẫn đầu trang (lead story) ── */}
          {lead && (
            <Box
              onClick={() => openDetail(lead)}
              sx={{
                px: { xs: 2.5, md: 6, lg: 10 },
                pb: { xs: 5, md: 7 },
                cursor: 'pointer',
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: lead.thumbnailUrl ? '1.15fr 1fr' : '1fr' },
                gap: { xs: 3, md: 6 },
                alignItems: 'center',
                '&:hover .lead-title': { color: '#086839' },
                '&:hover .lead-img': { transform: 'scale(1.015)' },
              }}
            >
              {lead.thumbnailUrl && (
                <Box sx={{ overflow: 'hidden', borderRadius: '4px' }}>
                  <Box
                    className="lead-img"
                    component="img"
                    src={lead.thumbnailUrl}
                    alt={lead.title}
                    sx={{
                      width: '100%',
                      height: { xs: 230, md: 400 },
                      objectFit: 'cover',
                      display: 'block',
                      transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1)',
                    }}
                  />
                </Box>
              )}
              <Box>
                <TypeTag type={lead.type} pinned={lead.isPinned} />
                <Typography className="lead-title" sx={{
                  fontWeight: 900,
                  fontSize: { xs: 26, md: lead.thumbnailUrl ? 36 : 44 },
                  letterSpacing: '-0.025em',
                  lineHeight: 1.12,
                  color: '#0f172a',
                  mt: 1.5,
                  mb: 2,
                  transition: 'color 0.2s',
                }}>
                  {lead.title}
                </Typography>
                <Typography sx={{
                  fontSize: { xs: 14.5, md: 16 },
                  color: '#475569',
                  lineHeight: 1.7,
                  mb: 2.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {excerpt(lead.content)}
                </Typography>
                <Meta item={lead} />
              </Box>
            </Box>
          )}

          {/* ── Các tin ghim còn lại: dải nền xanh nhạt full-width ── */}
          {subPinned.length > 0 && (
            <Box sx={{ bgcolor: '#f2f8f4', borderTop: '1px solid rgba(8,104,57,0.08)', borderBottom: '1px solid rgba(8,104,57,0.08)' }}>
              <Box sx={{
                px: { xs: 2.5, md: 6, lg: 10 },
                py: { xs: 4, md: 5 },
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: `repeat(${Math.min(subPinned.length, 3)}, 1fr)` },
                gap: { xs: 4, md: 6 },
              }}>
                {subPinned.map(item => (
                  <Box
                    key={item.id}
                    onClick={() => openDetail(item)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover .sub-title': { color: '#086839' },
                    }}
                  >
                    <TypeTag type={item.type} pinned />
                    <Typography className="sub-title" sx={{
                      fontWeight: 800,
                      fontSize: { xs: 19, md: 21 },
                      letterSpacing: '-0.015em',
                      lineHeight: 1.3,
                      color: '#0f172a',
                      mt: 1.2,
                      mb: 1.2,
                      transition: 'color 0.2s',
                    }}>
                      {item.title}
                    </Typography>
                    <Typography sx={{
                      fontSize: 14,
                      color: '#475569',
                      lineHeight: 1.65,
                      mb: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {excerpt(item.content, 140)}
                    </Typography>
                    <Meta item={item} />
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* ── Dòng tin mới nhất: danh sách báo chí, kẻ mảnh ── */}
          {feed.length > 0 && (
            <Box sx={{ px: { xs: 2.5, md: 6, lg: 10 }, py: { xs: 4, md: 6 } }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 1 }}>
                <Typography sx={{
                  fontWeight: 900,
                  fontSize: { xs: 20, md: 24 },
                  letterSpacing: '-0.02em',
                  color: '#0f172a',
                }}>
                  Tin mới nhất
                </Typography>
                <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(13,43,30,0.1)' }} />
              </Box>

              {feed.map(item => (
                <FeedRow key={item.id} item={item} onClick={() => openDetail(item)} />
              ))}
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, value) => setPage(value)}
                    shape="rounded"
                    sx={{
                      '& .Mui-selected': {
                        bgcolor: '#086839 !important',
                        color: '#fff',
                      },
                    }}
                  />
                </Box>
              )}
            </Box>
          )}
        </>
      )}
    </>
  );
}
