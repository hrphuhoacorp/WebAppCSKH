import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const { pathname } = request.nextUrl;

    // Kiểm tra xem user đang ở nhóm route nào
    const isDashboardRoute = pathname.startsWith('/dashboard');
    const isLoginRoute = pathname === '/login';

    // 1. Nếu CHƯA ĐĂNG NHẬP mà cố tình vào Dashboard -> Đá về trang Login
    if (!token && isDashboardRoute) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // 2. Nếu ĐÃ ĐĂNG NHẬP mà cố tình vào lại trang Login -> Đá ngược lại về Dashboard
    if (token && isLoginRoute) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

// Cập nhật lại matcher để Middleware quét qua cả trang login và dashboard
export const config = {
    matcher: [
        '/login',
        '/dashboard/:path*'
    ],
};