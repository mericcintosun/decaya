// npm run proof: runs the core proofs and the unit tests, then rewrites the PROOF blocks
// in README.md with what actually happened. Writes only README.md inside this repo.
// Every step has a timeout; any step it cannot do gets an honest "Not run in this build"
// line. It always exits 0 so it never blocks a build.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const readme = join(root, "README.md");
const today = new Date().toISOString().slice(0, 10);
const isWin = process.platform === "win32";
const tsxBin = join(root, "node_modules", ".bin", isWin ? "tsx.cmd" : "tsx");
const lines = {};

function run(cmd, args, timeout) {
  return spawnSync(cmd, args, { cwd: root, encoding: "utf8", timeout, shell: isWin, maxBuffer: 8 * 1024 * 1024 });
}

function why(res) {
  if (res.error && res.error.code === "ETIMEDOUT") return "the step timed out";
  if (res.error) return `the step could not start (${res.error.code ?? "spawn error"})`;
  if (res.signal) return `the step was stopped (${res.signal})`;
  return `the step exited with status ${res.status}`;
}

function fmt(n, digits = 2) {
  return Number(n).toFixed(digits);
}

// 1. Core proofs (synthetic decay, demo prediction, dry voice file).
try {
  if (!existsSync(tsxBin)) {
    const msg = "Not run in this build: tsx is not installed.";
    lines["synthetic-decay"] = msg;
    lines["demo-prediction"] = msg;
    lines["dry-voice"] = msg;
    lines.store = msg;
  } else {
    const res = run("npx", ["--no-install", "tsx", "scripts/proof-core.ts"], 45_000);
    const out = (res.stdout ?? "").trim().split("\n").filter(Boolean).pop() ?? "";
    let data = null;
    if (res.status === 0) {
      try {
        data = JSON.parse(out);
      } catch {
        data = null;
      }
    }
    if (!data) {
      const msg = `Not run in this build: scripts/proof-core.ts did not finish, ${res.status === 0 ? "its output was not JSON" : why(res)}.`;
      lines["synthetic-decay"] = msg;
      lines["demo-prediction"] = msg;
      lines["dry-voice"] = msg;
      lines.store = msg;
    } else {
      const st = data.store;
      lines.store = st
        ? `Run ${today}: lib/store.ts with an in-memory localStorage. Saving the same slug twice left ${st.roomsAfterDoubleSave} room. ` +
          `A corrupt stored string ${st.corruptThrew ? "threw" : "did not throw"} and reported ${st.corruptFailed ?? "no failure"}. ` +
          `Of two stored entries, the one missing its band values was skipped (kept ${st.missingMeasuredKept}, skipped ${st.missingMeasuredSkipped}).`
        : "Not run in this build: scripts/proof-core.ts returned no store result.";
      const s = data.syntheticDecay;
      lines["synthetic-decay"] =
        s.t20 === null
          ? `Run ${today}: T20 found no fit on the synthetic ${s.trueRt60} s decay.`
          : `Run ${today}: an ideal exponential decay with RT60 ${s.trueRt60} s (${s.sampleRate} Hz, no noise) went through schroederDb and t20 and read ${fmt(s.t20, 3)} s, an error of ${fmt(s.errorPercent, 2)} percent.`;
      const d = data.demoPrediction;
      lines["demo-prediction"] =
        `Run ${today}: demo room ${d.dims.width} x ${d.dims.length} x ${d.dims.height} m with the fixture measurement (mid band ${fmt(d.beforeMid)} s). ` +
        `Predicted mid band with ${d.items.join(" + ").toLowerCase()}: ${fmt(d.afterMid)} s. This is a Sabine prediction, not a measurement.`;
      lines["dry-voice"] = data.dryVoiceFile
        ? `Run ${today}: public/audio/dry-speech.wav is present, so the real engine plays the recorded clip.`
        : `Run ${today}: public/audio/dry-speech.wav is not present, so the A/B uses the formant synth voice.`;
    }
    console.log(`proof: core ${data ? "ok" : "not run"}`);
  }
} catch (e) {
  const msg = "Not run in this build: the core proof step failed to start.";
  lines["synthetic-decay"] = lines["synthetic-decay"] ?? msg;
  lines["demo-prediction"] = lines["demo-prediction"] ?? msg;
  lines["dry-voice"] = lines["dry-voice"] ?? msg;
  lines.store = lines.store ?? msg;
  console.log(`proof: core not run (${e && e.message ? e.message : "unknown"})`);
}

// 2. Unit tests.
try {
  if (!existsSync(tsxBin)) {
    lines.tests = "Not run in this build: tsx is not installed.";
  } else {
    const res = run("npm", ["test"], 60_000);
    const text = `${res.stdout ?? ""}\n${res.stderr ?? ""}`;
    const count = (name) => {
      const m = text.match(new RegExp(`^\\s*(?:#|ℹ)\\s*${name}\\s+(\\d+)\\s*$`, "m"));
      return m ? Number(m[1]) : null;
    };
    const total = count("tests");
    const pass = count("pass");
    const fail = count("fail");
    if (total === null || pass === null) {
      lines.tests = `Not run in this build: npm test did not report a result, ${why(res)}.`;
    } else if (res.status === 0 && (fail ?? 0) === 0) {
      lines.tests = `Run ${today}: npm test passed ${pass} of ${total} tests in tests/core.test.ts and tests/store.test.ts (node:test through tsx).`;
    } else {
      lines.tests = `Run ${today}: npm test failed, ${fail ?? total - pass} of ${total} tests in tests/core.test.ts and tests/store.test.ts did not pass.`;
    }
  }
  console.log(`proof: tests ${lines.tests.startsWith("Not run") ? "not run" : "done"}`);
} catch (e) {
  lines.tests = "Not run in this build: the test step failed to start.";
  console.log(`proof: tests not run (${e && e.message ? e.message : "unknown"})`);
}

// 3. Rewrite the README blocks.
try {
  let text = readFileSync(readme, "utf8");
  for (const [name, line] of Object.entries(lines)) {
    const re = new RegExp(`(<!-- PROOF:BEGIN ${name} -->)[\\s\\S]*?(<!-- PROOF:END ${name} -->)`);
    if (re.test(text)) text = text.replace(re, (_m, a, b) => `${a}\n${line}\n${b}`);
    console.log(`proof: ${name}: ${line}`);
  }
  writeFileSync(readme, text, "utf8");
} catch (e) {
  console.log(`proof: README not updated (${e && e.message ? e.message : "unknown"})`);
}

process.exit(0);
