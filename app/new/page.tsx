import type { Metadata } from "next";
import { NewRoomForm } from "@/components/new-room-form";
import { SceneSlot } from "@/components/scene-slot";
import { getAdapter } from "@/lib/adapter";

export const metadata: Metadata = { title: "Measure a room" };

export default function NewRoomPage() {
  const { mode } = getAdapter();
  return (
    <div className="space-y-8">
      <div className="grid items-center gap-6 md:grid-cols-[1fr_14rem]">
        <div className="max-w-[65ch]">
          <h1 className="text-4xl font-semibold">Measure a room</h1>
          <p className="mt-3 text-muted-foreground">Three claps, analyzed in this tab. The room lands at the top of the fieldbook.</p>
        </div>
        <SceneSlot n={4} alt="A phone on a desk listening to three clap spikes drawn on ruled paper, with a green stamp reading 3 of 3 claps valid" width={640} height={640} className="hidden border border-border md:block" />
      </div>
      <NewRoomForm mode={mode} />
    </div>
  );
}
