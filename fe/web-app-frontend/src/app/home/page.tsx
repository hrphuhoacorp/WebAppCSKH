'use client';

import { useEffect, useState, useRef } from 'react';
import { Box, Typography, CircularProgress, IconButton, InputBase, Pagination } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { newsApi } from '@/features/news/api/news.api';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { NewsItem, TYPE_LABEL, excerpt, timeAgo } from '@/features/news/news.shared';

// ─── Nhãn loại (dùng trên nền tối) ────────────────────────────
function TypeBadge({ type, pinned, light }: { type?: string; pinned?: boolean; light?: boolean }) {
  const info = type ? TYPE_LABEL[type] : null;
  const color = light ? '#fff' : (info?.color ?? '#086839');
  const bg = light ? 'rgba(255,255,255,0.18)' : (info ? info.color + '18' : '#08683918');
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      {pinned && (
        <Box component="span" sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.8, textTransform: 'uppercase', color: light ? '#fca5a5' : '#dc2626', bgcolor: light ? 'rgba(220,38,38,0.18)' : '#dc262614', px: 1.2, py: 0.4, borderRadius: '4px' }}>
          📌 Quan trọng
        </Box>
      )}
      {info && (
        <Box component="span" sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.8, textTransform: 'uppercase', color, bgcolor: bg, px: 1.2, py: 0.4, borderRadius: '4px' }}>
          {info.label}
        </Box>
      )}
    </Box>
  );
}

// ─── Dòng meta (tác giả · thời gian · lượt xem) ───────────────
function MetaRow({ item, light }: { item: NewsItem; light?: boolean }) {
  const c = light ? 'rgba(255,255,255,0.72)' : '#94a3b8';
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, color: c, fontSize: 12.5 }}>
      {item.createdByName && <span>{item.createdByName}</span>}
      {item.createdByName && <Box component="span" sx={{ opacity: 0.4 }}>·</Box>}
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4 }}>
        <AccessTimeRoundedIcon sx={{ fontSize: 12 }} />{timeAgo(item.createdAt)}
      </Box>
      <Box component="span" sx={{ opacity: 0.4 }}>·</Box>
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4 }}>
        <VisibilityRoundedIcon sx={{ fontSize: 12 }} />{item.viewCount}
      </Box>
    </Box>
  );
}

// ─── Hero: bài nổi bật toàn trang ─────────────────────────────
function HeroArticle({ item, onClick }: { item: NewsItem; onClick: () => void }) {
  if (item.thumbnailUrl) {
    return (
      <Box
        onClick={onClick}
        sx={{
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          '&:hover .hero-img': { transform: 'scale(1.025)' },
          '&:hover .hero-title': { color: '#86efac' },
        }}
      >
        <Box
          className="hero-img"
          component="img"
          src={item.thumbnailUrl}
          alt={item.title}
          sx={{
            width: '100%',
            height: { xs: 280, sm: 420, md: 560 },
            objectFit: 'cover',
            display: 'block',
            transition: 'transform 0.8s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
        {/* Gradient overlay */}
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.02) 20%, rgba(0,0,0,0.82) 100%)' }} />
        {/* Text trên overlay */}
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, px: { xs: 2.5, md: 6, lg: 10 }, pb: { xs: 4, md: 6 } }}>
          <TypeBadge type={item.type} pinned={item.isPinned} light />
          <Typography
            className="hero-title"
            sx={{
              fontWeight: 900,
              fontSize: { xs: 22, sm: 30, md: 42, lg: 50 },
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              color: '#fff',
              mt: 1.5, mb: 2,
              transition: 'color 0.25s',
              textShadow: '0 2px 16px rgba(0,0,0,0.4)',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {item.title}
          </Typography>
          <MetaRow item={item} light />
        </Box>
      </Box>
    );
  }

  // Không có ảnh → text hero
  const typeInfo = item.type ? TYPE_LABEL[item.type] : null;
  return (
    <Box
      onClick={onClick}
      sx={{
        px: { xs: 2.5, md: 6, lg: 10 },
        py: { xs: 5, md: 8 },
        cursor: 'pointer',
        borderBottom: '1px solid rgba(13,43,30,0.08)',
        borderLeft: typeInfo ? `4px solid ${typeInfo.color}` : '4px solid #086839',
        pl: { xs: 3, md: 7, lg: 11 },
        '&:hover .hero-title-text': { color: '#086839' },
      }}
    >
      <TypeBadge type={item.type} pinned={item.isPinned} />
      <Typography
        className="hero-title-text"
        sx={{ fontWeight: 900, fontSize: { xs: 28, md: 48 }, letterSpacing: '-0.03em', lineHeight: 1.1, color: '#0f172a', mt: 2, mb: 2.5, transition: 'color 0.2s' }}
      >
        {item.title}
      </Typography>
      <Typography sx={{ fontSize: { xs: 14.5, md: 17 }, color: '#475569', lineHeight: 1.75, mb: 3, maxWidth: 720, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {excerpt(item.content)}
      </Typography>
      <MetaRow item={item} />
    </Box>
  );
}

// ─── Card bài viết trong grid ──────────────────────────────────
function ArticleCard({ item, onClick }: { item: NewsItem; onClick: () => void }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        '&:hover .card-title': { color: '#086839' },
        '&:hover .card-img': { transform: 'scale(1.04)' },
      }}
    >
      {/* Ảnh */}
      <Box sx={{ overflow: 'hidden', borderRadius: '6px', mb: 2, bgcolor: '#f1f5f9' }}>
        {item.thumbnailUrl ? (
          <Box
            className="card-img"
            component="img"
            src={item.thumbnailUrl}
            alt={item.title}
            sx={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block', transition: 'transform 0.55s cubic-bezier(0.4,0,0.2,1)' }}
          />
        ) : (
          <Box sx={{
            width: '100%', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: item.type && TYPE_LABEL[item.type] ? `linear-gradient(135deg, ${TYPE_LABEL[item.type].color}22, ${TYPE_LABEL[item.type].color}44)` : 'linear-gradient(135deg, #08683922, #08683944)',
          }}>
            <Typography sx={{ fontSize: 32, opacity: 0.5 }}>📰</Typography>
          </Box>
        )}
      </Box>
      <TypeBadge type={item.type} pinned={item.isPinned} />
      <Typography
        className="card-title"
        sx={{ fontWeight: 800, fontSize: { xs: 16, md: 18 }, letterSpacing: '-0.015em', lineHeight: 1.35, color: '#0f172a', mt: 1.2, mb: 1.2, transition: 'color 0.2s', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
      >
        {item.title}
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.65, mb: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {excerpt(item.content, 120)}
      </Typography>
      <MetaRow item={item} />
    </Box>
  );
}

// ─── Row bài viết trong danh sách ─────────────────────────────
function FeedItem({ item, onClick }: { item: NewsItem; onClick: () => void }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        py: { xs: 3, md: 3.5 },
        borderBottom: '1px solid rgba(13,43,30,0.07)',
        display: 'grid',
        gridTemplateColumns: item.thumbnailUrl ? { xs: '1fr 90px', md: '1fr 160px' } : '1fr',
        gap: { xs: 2, md: 4 },
        alignItems: 'center',
        cursor: 'pointer',
        '&:hover .feed-title': { color: '#086839' },
        '&:hover .feed-img': { transform: 'scale(1.04)' },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <TypeBadge type={item.type} pinned={item.isPinned} />
        <Typography
          className="feed-title"
          sx={{ fontWeight: 800, fontSize: { xs: 16, md: 20 }, letterSpacing: '-0.015em', lineHeight: 1.3, color: '#0f172a', mt: 1, mb: 1, transition: 'color 0.2s', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {item.title}
        </Typography>
        <Typography sx={{ fontSize: 14, color: '#64748b', lineHeight: 1.65, mb: 1.5, display: { xs: 'none', md: '-webkit-box' }, WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {excerpt(item.content, 150)}
        </Typography>
        <MetaRow item={item} />
      </Box>
      {item.thumbnailUrl && (
        <Box sx={{ overflow: 'hidden', borderRadius: '6px', flexShrink: 0 }}>
          <Box
            className="feed-img"
            component="img"
            src={item.thumbnailUrl}
            alt={item.title}
            sx={{ width: '100%', height: { xs: 72, md: 110 }, objectFit: 'cover', display: 'block', transition: 'transform 0.5s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </Box>
      )}
    </Box>
  );
}

// ─── Tiêu đề section ──────────────────────────────────────────
function SectionTitle({ title }: { title: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0 }}>
      <Box sx={{ width: 3, height: 20, bgcolor: '#086839', borderRadius: '2px', flexShrink: 0 }} />
      <Typography sx={{ fontWeight: 900, fontSize: { xs: 17, md: 20 }, letterSpacing: '-0.02em', color: '#0f172a' }}>
        {title}
      </Typography>
      <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(13,43,30,0.08)' }} />
    </Box>
  );
}

// ─── Trang chủ ────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchParams = useSearchParams();
  const [category, setCategory] = useState(searchParams.get('category') ?? 'all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const totalPages = Math.ceil(totalItems / pageSize);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, category]);

  useEffect(() => {
    setCategory(searchParams.get('category') ?? 'all');
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    newsApi.getPaged({
      status: 'published', pageSize, page,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(category !== 'all' ? { type: category } : {}),
    })
      .then(res => { setNews(res.content.items ?? []); setTotalItems(res.content.totalItems ?? 0); })
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, [page, pageSize, debouncedSearch, category]);

  const go = (item: NewsItem) => router.push(`/home/${item.id}`);
  const isFiltering = category !== 'all' || debouncedSearch !== '';
  const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Chia layout: hero → grid (3 bài) → feed (còn lại)
  const hero = news[0];
  const gridItems = news.slice(1, 4);
  const feedItems = news.slice(4);

  if (loading && news.length === 0) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 20 }}>
        <CircularProgress size={32} sx={{ color: '#086839' }} />
      </Box>
    );
  }

  return (
    <>
      {/* ── Masthead strip ── */}
      <Box sx={{
        px: { xs: 2.5, md: 5, lg: 8 },
        height: { xs: 48, md: 52 },
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        borderBottom: '1px solid rgba(13,43,30,0.08)',
      }}>
        {/* Date */}
        <Typography sx={{ fontSize: 11.5, fontWeight: 500, color: '#94a3b8', flexShrink: 0, display: { xs: 'none', sm: 'block' } }}>
          {today}
        </Typography>

        {/* Title — chỉ hiện khi không filter */}
        {!isFiltering && (
          <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', display: { xs: 'none', md: 'block' } }}>
            <Box component="span" sx={{ color: '#086839' }}>Bảng tin</Box>
            {' '}
            <Box component="span" sx={{ color: '#0f172a' }}>Nội bộ</Box>
          </Typography>
        )}

        {/* Filter badges */}
        {isFiltering && (
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1.5 }}>
            {category !== 'all' && TYPE_LABEL[category] && (
              <Box sx={{ px: 1.4, py: 0.35, borderRadius: '5px', bgcolor: TYPE_LABEL[category].color + '14', color: TYPE_LABEL[category].color, fontSize: 11.5, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                {TYPE_LABEL[category].label}
              </Box>
            )}
            {debouncedSearch && (
              <Typography sx={{ fontSize: 12.5, color: '#64748b', fontStyle: 'italic' }}>
                Kết quả cho "{debouncedSearch}"
              </Typography>
            )}
          </Box>
        )}

        <Box sx={{ flex: 1 }} />

        {/* Search */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 0.8,
          px: 1.8, height: 36, borderRadius: '8px',
          border: '1px solid rgba(13,43,30,0.1)',
          width: { xs: 180, sm: 240, md: 280 },
          maxWidth: 320,
          bgcolor: '#f8fafc',
          transition: 'border-color 0.2s, box-shadow 0.2s, background-color 0.2s',
          '&:focus-within': { borderColor: '#086839', boxShadow: '0 0 0 3px rgba(8,104,57,0.08)', bgcolor: '#fff' },
        }}>
          <SearchRoundedIcon sx={{ fontSize: 15, color: '#94a3b8', flexShrink: 0 }} />
          <InputBase placeholder="Tìm kiếm bài viết..." value={search} onChange={e => setSearch(e.target.value)} sx={{ fontSize: 13, flex: 1, color: '#0f172a' }} />
          {search && <IconButton size="small" onClick={() => setSearch('')} sx={{ p: 0.25 }}><CloseRoundedIcon sx={{ fontSize: 13, color: '#94a3b8' }} /></IconButton>}
        </Box>
      </Box>

      {/* Loading overlay */}
      {loading && news.length > 0 && (
        <Box sx={{ position: 'fixed', top: 68, left: 0, right: 0, zIndex: 100, display: 'flex', justifyContent: 'center', pt: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#0d2b1e', color: '#4ade80', px: 2.5, py: 0.8, borderRadius: '999px', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <CircularProgress size={12} sx={{ color: '#4ade80' }} /> Đang tải...
          </Box>
        </Box>
      )}

      {/* Empty state */}
      {news.length === 0 && !loading && (
        <Box sx={{ px: { xs: 2.5, md: 6, lg: 10 }, py: 14, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 44, mb: 1.5 }}>{isFiltering ? '🔍' : '📭'}</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 17, color: '#334155' }}>
            {isFiltering ? 'Không tìm thấy bài viết phù hợp' : 'Chưa có tin nội bộ nào'}
          </Typography>
          {isFiltering && <Typography sx={{ color: '#94a3b8', fontSize: 13.5, mt: 0.5 }}>Thử từ khóa khác hoặc chọn danh mục khác</Typography>}
        </Box>
      )}

      {/* ── Kết quả tìm kiếm / lọc ── */}
      {news.length > 0 && isFiltering && (
        <Box sx={{ px: { xs: 2.5, md: 6, lg: 10 }, pt: 3, pb: { xs: 6, md: 10 } }}>
          <Typography sx={{ fontSize: 13, color: '#94a3b8', fontWeight: 600, mb: 3 }}>
            Tìm thấy <Box component="b" sx={{ color: '#086839' }}>{totalItems}</Box> bài viết
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: { xs: 4, md: 5 } }}>
            {news.map(item => <ArticleCard key={item.id} item={item} onClick={() => go(item)} />)}
          </Box>
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
              <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} shape="rounded" sx={{ '& .Mui-selected': { bgcolor: '#086839 !important', color: '#fff' } }} />
            </Box>
          )}
        </Box>
      )}

      {/* ── Layout báo bình thường ── */}
      {news.length > 0 && !isFiltering && (
        <Box sx={{ pb: { xs: 8, md: 12 } }}>
          {/* Hero */}
          {hero && <HeroArticle item={hero} onClick={() => go(hero)} />}

          {/* Grid 3 bài */}
          {gridItems.length > 0 && (
            <Box sx={{ px: { xs: 2.5, md: 6, lg: 10 }, mt: { xs: 5, md: 7 } }}>
              <SectionTitle title="Tin mới nhất" />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: `repeat(${Math.min(gridItems.length, 3)}, 1fr)` }, gap: { xs: 4, md: 5 }, mt: 3 }}>
                {gridItems.map(item => <ArticleCard key={item.id} item={item} onClick={() => go(item)} />)}
              </Box>
            </Box>
          )}

          {/* Feed danh sách */}
          {feedItems.length > 0 && (
            <Box sx={{ px: { xs: 2.5, md: 6, lg: 10 }, mt: { xs: 5, md: 7 } }}>
              <SectionTitle title="Các bài viết khác" />
              <Box sx={{ mt: 1 }}>
                {feedItems.map(item => <FeedItem key={item.id} item={item} onClick={() => go(item)} />)}
              </Box>
            </Box>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ px: { xs: 2.5, md: 6, lg: 10 }, mt: 5, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={totalPages} page={page}
                onChange={(_, v) => { setPage(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                shape="rounded"
                sx={{ '& .Mui-selected': { bgcolor: '#086839 !important', color: '#fff' } }}
              />
            </Box>
          )}
        </Box>
      )}
    </>
  );
}
