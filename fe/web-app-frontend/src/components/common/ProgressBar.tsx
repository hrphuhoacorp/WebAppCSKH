'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

NProgress.configure({ showSpinner: false, speed: 400, trickleSpeed: 200 });

export default function ProgressBar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const prev = useRef({ pathname, searchParams });

    useEffect(() => {
        const prevPath = prev.current.pathname;
        const prevSearch = prev.current.searchParams?.toString();
        const currSearch = searchParams?.toString();

        if (prevPath !== pathname || prevSearch !== currSearch) {
            NProgress.done(); // route đã đổi → kết thúc bar
        }

        prev.current = { pathname, searchParams };
    }, [pathname, searchParams]);

    // Bắt đầu bar khi click link — dùng event delegation
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = (e.target as HTMLElement).closest('a');
            if (!target) return;
            const href = target.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('http')) return;
            NProgress.start();
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    return null;
}