#!/usr/bin/env node
// Stop hook: reminds Claude to verify before finishing.
// exit 2 = feed stdout back to Claude as instruction (Claude continues).
// exit 0 = let Claude stop (used when already in verification loop).

let raw = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let input = {};
  try { input = JSON.parse(raw); } catch { process.exit(0); }

  // stop_hook_active = true means we're already in the verification loop — let it stop.
  if (input.stop_hook_active) process.exit(0);

  const reminder = [
    "STOP CHECK — before finishing, confirm each applicable item:",
    "1. Changed code/logic? → `npm run build` must pass (run it if you haven't).",
    "2. Changed UI? → describe what you verified (locally or on Vercel).",
    "3. Was this a substantial session? → update .handoff.md.",
    "If all done or not applicable → you may stop.",
  ].join("\n");

  process.stdout.write(reminder + "\n");
  process.exit(2);
});
