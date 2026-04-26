import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";
import { getInitialSettings } from "@/lib/server-settings";

export const metadata: Metadata = {
  title: "A.Z Finance Hub",
  description: "Personal Sukuk & Fixed-Income Portfolio Management — v2.1",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0a0f1c",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initial = await getInitialSettings();
  return (
    <html
      lang={initial.language}
      dir={initial.language === "ar" ? "rtl" : "ltr"}
      data-font-size={initial.fontSize}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers initialSettings={initial}>
          {children}
          <PwaRegister />
        </Providers>
      </body>
    </html>
  );
}
