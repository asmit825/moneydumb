import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";

export const metadata: Metadata = {
  title: 'MONEY_DUMB', // Change this
  description: 'Financial Command Center',
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents zooming on iPhone inputs
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-retro-black text-retro-green selection:bg-retro-green selection:text-retro-black">
        {children}
      </body>
    </html>
  );
}