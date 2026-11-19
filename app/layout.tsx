import type { Metadata } from 'next';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SITE } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  title: SITE.name,
  description: SITE.description,
  authors: [{ name: SITE.author, url: SITE.authorUrl || undefined }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
