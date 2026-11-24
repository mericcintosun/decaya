import type { Metadata } from "next";
import { NewRoomForm } from "@/components/new-room-form";

export const metadata: Metadata = { title: "Measure a room" };

export default function NewRoomPage() {
  return (
    <div className="space-y-8">
      <div className="max-w-[68ch]">
        <h1 className="text-4xl font-semibold">Measure a room</h1>
        <p className="mt-3 text-muted-foreground">
          Your audio never leaves this tab. Decaya keeps the result in this browser and adds it to the top of the fieldbook,
          where you can try curtains and rugs on it and listen.
        </p>
      </div>
      <NewRoomForm />
    </div>
  );
}
