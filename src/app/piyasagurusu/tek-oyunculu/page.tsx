import SinglePlayerHub from "@/components/SinglePlayerHub";
import TopBar from "@/components/TopBar";

export default function SinglePlayerPage() {
  return (
    <main className="flex-1 flex flex-col py-2 lg:h-dvh lg:overflow-hidden lg:py-0">
      <TopBar title="Tek Oyunculu" />
      <div className="lg:flex-1 lg:min-h-0 lg:flex lg:flex-col">
        <div className="w-full lg:flex-1 lg:min-h-0 lg:flex lg:flex-col">
          <SinglePlayerHub />
        </div>
      </div>
    </main>
  );
}
