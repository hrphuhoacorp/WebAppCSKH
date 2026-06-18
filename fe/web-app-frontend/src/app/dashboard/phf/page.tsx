'use client';

export default function PhfDashboardPage() {
    return (
        <iframe
            src="/phf/index.html"
            style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
            title="PHF Dashboard Sapo"
        />
    );
}
