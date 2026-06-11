import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataPath = path.join(rootDir, "data", "worldcup-2026.json");

const expectedStages = new Map([
  ["Vòng bảng", 72],
  ["Vòng 1/32", 16],
  ["Vòng 1/8", 8],
  ["Tứ kết", 4],
  ["Bán kết", 2],
  ["Tranh hạng ba", 1],
  ["Chung kết", 1]
]);

const data = JSON.parse(await readFile(dataPath, "utf8"));
const failures = [];

if (data.matches.length !== 104) {
  failures.push(`Expected 104 matches, got ${data.matches.length}`);
}

if (data.venues.length !== 16) {
  failures.push(`Expected 16 venues, got ${data.venues.length}`);
}

const stageCounts = data.matches.reduce((counts, match) => {
  counts.set(match.stageVi, (counts.get(match.stageVi) || 0) + 1);
  return counts;
}, new Map());

for (const [stage, expectedCount] of expectedStages) {
  const actualCount = stageCounts.get(stage) || 0;
  if (actualCount !== expectedCount) {
    failures.push(`Expected ${expectedCount} matches for ${stage}, got ${actualCount}`);
  }
}

const missingStadiums = data.matches.filter((match) => !match.stadium?.name || match.stadium.name === "Chưa xác định");
if (missingStadiums.length > 0) {
  failures.push(`${missingStadiums.length} matches are missing stadium names`);
}

if (data.timezone !== "Asia/Ho_Chi_Minh") {
  failures.push(`Expected timezone Asia/Ho_Chi_Minh, got ${data.timezone}`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Data check passed");
  console.log(`Matches: ${data.matches.length}`);
  console.log(`Venues: ${data.venues.length}`);
  console.log(
    [...stageCounts.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "vi"))
      .map(([stage, count]) => `${stage}: ${count}`)
      .join("\n")
  );
}
