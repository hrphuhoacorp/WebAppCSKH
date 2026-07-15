import { cookies } from 'next/headers';
import HomeNewsClient from '@/features/news/components/HomeNewsClient';
import { NewsItem } from '@/features/news/news.shared';

type SearchParams = Promise<{ category?: string; search?: string; page?: string }>;

const PAGE_SIZE = 10;

async function fetchNews(params: { category: string; search: string; page: number }) {
    try {
        const cookieStore = await cookies();
        const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');
        const baseUrl = (process.env.NEXT_PUBLIC_DOTNET_API_URL ?? '').replace(/\/$/, '');
        const url = new URL(`${baseUrl}/InternalNews/GetPaged`);
        url.searchParams.set('status', 'published');
        url.searchParams.set('page', String(params.page));
        url.searchParams.set('pageSize', String(PAGE_SIZE));
        if (params.search) url.searchParams.set('search', params.search);
        if (params.category !== 'all') url.searchParams.set('type', params.category);
        const res = await fetch(url.toString(), {
            headers: { Cookie: cookieHeader },
            cache: 'no-store',
        });
        if (!res.ok) return { items: [] as NewsItem[], total: 0 };
        const data = await res.json();
        return {
            items: (data.content?.items ?? []) as NewsItem[],
            total: (data.content?.totalItems ?? 0) as number,
        };
    } catch {
        return { items: [] as NewsItem[], total: 0 };
    }
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
    const sp = await searchParams;
    const category = sp.category ?? 'all';
    const search = sp.search ?? '';
    const page = Math.max(1, Number(sp.page ?? 1));

    const { items, total } = await fetchNews({ category, search, page });

    return (
        <HomeNewsClient
            key={`${category}-${page}-${search}`}
            initialItems={items}
            initialTotal={total}
            initialCategory={category}
            initialSearch={search}
            initialPage={page}
        />
    );
}
