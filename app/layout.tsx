import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RepoGym - Master Codebases Interactively',
  description: 'Turn any GitHub repository into an interactive learning and code tracing session.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
