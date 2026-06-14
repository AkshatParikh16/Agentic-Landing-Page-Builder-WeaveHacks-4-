import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Landing Page Builder',
  description: 'AI-powered landing page generator',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/app.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
