import SinglePlayerHub from "@/components/SinglePlayerHub";
import TopBar from "@/components/TopBar";

export default function SinglePlayerPage() {
  return (
    <main className="flex-1 flex flex-col py-2">
      <TopBar title="Tek Oyunculu" />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full">
          <SinglePlayerHub />
        </div>
      </div>
    </main>
  );
}
