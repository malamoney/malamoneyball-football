import { requireFlag } from "./cli-args.js";
import { withDatabase } from "./database/client.js";
import {
  clearManualOverride,
  setManualOverride,
} from "./database/overrides.js";

async function main(): Promise<void> {
  const contestKey = requireFlag("contest-key");
  const userKey = requireFlag("user-key");

  if (process.argv.includes("--clear")) {
    const removed = await withDatabase((sql) =>
      clearManualOverride(sql, contestKey, userKey)
    );
    console.log(removed ? "Manual override removed." : "No override existed.");
    return;
  }

  const fantasyPoints = Number(requireFlag("points"));
  const reason = requireFlag("reason");
  await withDatabase((sql) =>
    setManualOverride(sql, {
      contestKey,
      userKey,
      fantasyPoints,
      reason,
    })
  );
  console.log("Manual result saved.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Unable to update manual result: " + message);
  process.exitCode = 1;
});
