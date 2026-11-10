import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomTabs from "@/components/BottomTabs";
import ClientInit from "@/components/ClientInit";

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "토익 단어",
  description: "TOEIC 900 빈출 단어 암기 (SRS)",
  manifest: `${base}/manifest.webmanifest`,
  appleWebApp: { capable: true, title: "토익 단어", statusBarStyle: "black-translucent" },
  icons: {
    icon: `${base}/icons/icon-192.png`,
    apple: `${base}/icons/apple-touch-icon.png`,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

// 첫 페인트 전에 다크모드 클래스를 적용해 깜빡임 방지
const themeScript = `(function(){try{var t=localStorage.getItem('theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <ClientInit />
        <main className="mx-auto max-w-md px-4 pt-4 pb-28 safe-top">{children}</main>
        <BottomTabs />
      </body>
    </html>
  );
}
