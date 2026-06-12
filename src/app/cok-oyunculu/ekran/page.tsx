import MonitorGame from "@/components/multiplayer/MonitorGame";

export const metadata = {
  title: "Monitör Modu — Fiyat Gurusu",
  description: "TV veya PC'de çok oyunculu oyunu göster, oyuncular telefondan katılsın.",
};

export default function MonitorPage() {
  return (
    <main className="min-h-screen">
      <MonitorGame />
    </main>
  );
}
