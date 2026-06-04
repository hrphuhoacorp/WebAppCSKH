// Đổi tên file thành: middleware.ts (nếu chưa đúng)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('token')?.value; // Lấy .value để chính xác

    const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');

    if (!token && isDashboard) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

// Thêm config matcher để giới hạn middleware chỉ chạy qua các route cần thiết
export const config = {
    matcher: ['/dashboard/:path*'],
};