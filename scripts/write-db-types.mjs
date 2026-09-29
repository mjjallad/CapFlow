// Writes src/lib/supabase/database.types.ts from a persisted
// `generate_typescript_types` MCP result file.
import { readFile, writeFile } from "node:fs/promises";

const [, , file] = process.argv;
if (!file) {
  console.error("usage: node scripts/write-db-types.mjs <persisted-result.json>");
  process.exit(1);
}
const outer = JSON.parse(await readFile(file, "utf8"));
const { types } = JSON.parse(outer[0].text);
await writeFile("src/lib/supabase/database.types.ts", types);
console.log(`wrote ${types.length} chars`);
