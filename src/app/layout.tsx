import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Global Need-Based Aid Visualization',
  description: 'Explore humanitarian need across the globe with our interactive 3D visualization platform. View 2025 data on need scores, vulnerable populations, and how you can help.',
  keywords: ['humanitarian', 'aid', 'visualization', 'globe', 'need score', '2025'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
