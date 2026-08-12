import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

const root = "apps/web/dist/client";
const forbidden = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "MODEL_API_KEY",
  "OPENROUTER_API_KEY",
  "FC_SANDBOX_API_KEY",
  "E2B_API_KEY",
  "@lovable.dev/",
  "ai.gateway.lovable.dev",
  "LOVABLE_API_KEY",
];
const files = (await findFiles(root)).filter((file) => [".html", ".js", ".css"].includes(extname(file)));
const findings = [];

for (const file of files) {
  const content = await readFile(file, "utf8");
  for (const value of forbidden) {
    if (content.includes(value)) findings.push(`${file}: ${value}`);
  }
}

if (findings.length > 0) {
  console.error(`Forbidden value found in client bundle:\n${findings.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Checked ${files.length} client assets: no server-only or Lovable values found.`);
}

async function findFiles(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...(await findFiles(path)));
    else output.push(path);
  }
  return output;
}
