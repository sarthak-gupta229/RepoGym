import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RepoGym - Interactive Codebase Comprehension Engine',
  description: 'Map architecture, trace request flows, and verify code comprehension with line citations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#000000] text-[#EDEDED] antialiased selection:bg-[#EDEDED] selection:text-[#000000]">
        {children}
      </body>
    </html>
  );
}
