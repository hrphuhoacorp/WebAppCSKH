import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import AppProviders from '@/providers/AppProviders';
import { Inter } from 'next/font/google';
import NextTopLoader from 'nextjs-toploader';

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
          <NextTopLoader
            color="#086839"
            initialPosition={0.15}
            crawlSpeed={150}
            height={3}
            showSpinner={false}
            easing="ease"
            speed={350}
            shadow="0 0 10px #086839,0 0 5px #4ade80"
          />
          <AppProviders>
            {children}
          </AppProviders>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}