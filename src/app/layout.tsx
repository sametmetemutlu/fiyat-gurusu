import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fredoka } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  weight: ["500", "600", "700"],
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Fiyat Gurusu — Fiyat Tahmin Oyunu",
  description: "Araba ve ev ilanlarının fiyatını tahmin et, en yakını sen ol!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${jakarta.variable} ${fredoka.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
