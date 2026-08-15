import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

const root = "apps/web/dist/client";
const serverSecretNames = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "MODEL_API_KEY",
  "OPENROUTER_API_KEY",
  "VERTEX_API_KEY",
  "FC_SANDBOX_API_KEY",
  "E2B_API_KEY",
];
const forbidden = [
  ...serverSecretNames.map((value) => ({ label: value, value })),
  { label: "Lovable package", value: "@lovable.dev/" },
  { label: "Lovable gateway", value: "ai.gateway.lovable.dev" },
  { label: "Lovable key name", value: "LOVABLE_API_KEY" },
  ...serverSecretNames.flatMap((name) => {
    const value = process.env[name];
    return value && value.length >= 8 ? [{ label: `${name} value`, value }] : [];
  }),
];
const files = (await findFiles(root)).filter((file) => [".html", ".js", ".css"].includes(extname(file)));
const findings = [];

for (const file of files) {
  const content = await readFile(file, "utf8");
  for (const pattern of forbidden) {
    if (content.includes(pattern.value)) findings.push(`${file}: ${pattern.label}`);
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
