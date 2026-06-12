import TopBar from "@/components/TopBar";
import MultiplayerGame from "@/components/multiplayer/MultiplayerGame";

export default function MultiplayerPage() {
  return (
    <main className="flex-1 flex flex-col py-2">
      <TopBar title="Çok Oyunculu" />
      <MultiplayerGame />
    </main>
  );
}
