import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Piyasa Gurusu — Fiyat Tahmin Oyunu",
  description: "Araba ve ev ilanlarının fiyatını tahmin et, en yakını sen ol!",
};

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return children;
}
