import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import AppProviders from '@/providers/AppProviders';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import ProgressBar from '@/components/common/ProgressBar';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={inter.variable}>
        <AppRouterCacheProvider>
          <AppProviders>
            <Suspense fallback={null}>
              <ProgressBar />
            </Suspense>{children}</AppProviders>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}