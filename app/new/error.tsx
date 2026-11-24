"use client";

import { ErrorState } from "@/components/states";

// The measuring page could not render. No error text is shown: a retry and a way home.
export default function NewRoomError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      stamp="Tag smudged"
      title="The measuring page could not open"
      hint="Nothing was recorded or saved. Try again, or go back to the fieldbook."
      onRetry={() => reset()}
    />
  );
}
