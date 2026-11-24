"use client";

import { ErrorState } from "@/components/states";

// Shows no error message or stack on purpose: the visitor gets a retry and a way home.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="Decaya hit a snag on this page"
      hint="Your rooms in this browser are safe. Try again, or go back to the fieldbook."
      onRetry={() => reset()}
    />
  );
}
