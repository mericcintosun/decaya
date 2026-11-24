"use client";

import { ErrorState } from "@/components/states";

// The bench could not render. No error text is shown: a retry and a way home.
export default function RoomError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      stamp="Bench tipped over"
      title="This room could not be opened"
      hint="Your rooms in this browser are safe. Try again, or pick the room from the fieldbook."
      onRetry={() => reset()}
    />
  );
}
