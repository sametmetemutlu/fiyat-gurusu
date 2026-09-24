import TopBar from "@/components/TopBar";
import MultiplayerGame from "@/components/multiplayer/MultiplayerGame";

export default function MultiplayerPage() {
  return (
    <main className="flex-1 flex flex-col py-2 lg:h-dvh lg:overflow-hidden lg:py-0">
      <TopBar title="Çok Oyunculu" />
      <div className="lg:flex-1 lg:min-h-0 lg:flex lg:flex-col">
        <MultiplayerGame />
      </div>
    </main>
  );
}
