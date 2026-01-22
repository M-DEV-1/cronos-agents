import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Agents of Truth",
  description: "An open-source platform for x402-enabled AI agents on Cronos",
};

import { Providers } from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body
        className={`${inter.variable} ${newsreader.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
