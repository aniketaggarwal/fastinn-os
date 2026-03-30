import type { Metadata } from 'next';
import './globals.css';
import SiteFooter from '@/components/SiteFooter';

export const metadata: Metadata = {
    title: 'FastInn — Luxury Hotel Booking',
    description: 'Discover and book curated luxury hotel experiences.',
    keywords: ['hotel booking', 'luxury hotels', 'FastInn'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="theme-color" content="#080604" />
            </head>
            <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <div style={{ flex: 1 }}>{children}</div>
                <SiteFooter />
            </body>
        </html>
    );
}
