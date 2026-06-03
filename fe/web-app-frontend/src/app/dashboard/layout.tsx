import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div
            style={{
                display: 'flex',
                minHeight: '100vh',
            }}
        >
            <Sidebar />

            <main
                style={{
                    flex: 1,
                }}
            >
                {children}
            </main>
        </div>
    );
}