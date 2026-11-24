// Typed errors for the measurement engine and the API routes.
// Every error the user can see carries a code and one human sentence. No raw stack
// and no browser or provider message text is passed through.

export type ErrorCode =
  | "invalid_input"
  | "upstream_timeout"
  | "upstream_error"
  | "parse_failure"
  | "not_configured"
  | "not_found"
  | "mic_unavailable"
  | "mic_denied"
  | "no_clap"
  | "fit_failed";

export interface CoreError {
  error: ErrorCode;
  hint: string;
}

export const HINTS: Record<ErrorCode, string> = {
  invalid_input: "That request was not in the expected format.",
  upstream_timeout: "A file took too long to load. Try again in a moment.",
  upstream_error: "A file could not be loaded. Try again in a moment.",
  parse_failure: "Stored data could not be read, so it was skipped.",
  not_configured: "This part of Decaya is not set up on this deploy.",
  not_found: "Nothing matches that address. Rooms you measure stay in the browser you measured them in.",
  mic_unavailable: "This browser cannot open a microphone. Use Chrome, Edge or Safari over HTTPS on a device with a mic.",
  mic_denied: "Microphone access was blocked. Allow it from the address bar, then try again.",
  no_clap: "No clap stood out from the background noise. Clap louder and sharper, closer to the middle of the room.",
  fit_failed: "No clap gave a clean decay to fit. Wait for a quieter moment and clap sharply, about two seconds apart.",
};

/** Builds a CoreError. The hint defaults to the standard sentence for the code. */
export function coreError(code: ErrorCode, hint: string = HINTS[code]): CoreError {
  return { error: code, hint };
}

const CODES = new Set<string>(Object.keys(HINTS));

export function isCoreError(x: unknown): x is CoreError {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as CoreError).error === "string" &&
    CODES.has((x as CoreError).error) &&
    typeof (x as CoreError).hint === "string"
  );
}

/** Thrown inside lib/acoustics.ts so the engine can map failures to a code without reading message text. */
export class CoreFailure extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, detail?: string) {
    super(detail ?? HINTS[code]);
    this.name = "CoreFailure";
    this.code = code;
  }
}
