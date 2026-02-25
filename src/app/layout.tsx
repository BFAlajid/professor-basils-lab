import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import { Providers } from "./providers";
import OfflineIndicator from "@/components/OfflineIndicator";
import InstallPrompt from "@/components/InstallPrompt";
import "./globals.css";

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pokemon Team Builder",
  description:
    "Build your Pokemon team with type coverage analysis and battle simulation",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="theme-color" content="#1a1c2c" />
      </head>
      <body
        className={`${pressStart2P.variable} ${vt323.variable}`}
      >
        <Providers>
          <OfflineIndicator />
          {children}
          <InstallPrompt />
        </Providers>
      </body>
    </html>
  );
}
