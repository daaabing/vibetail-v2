import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

const roots = ["apps", "packages"];
const manifests = [
  "package.json",
  "pnpm-lock.yaml",
  ...(await findFiles("apps", "package.json")),
  ...(await findFiles("packages", "package.json")),
];
const sourceFiles = (await Promise.all(roots.map((root) => findFiles(root)))).flat();
const candidates = [...new Set([...manifests, ...sourceFiles])].filter(
  (file) => file === "pnpm-lock.yaml" || [".json", ".js", ".mjs", ".ts", ".tsx"].includes(extname(file)),
);
const forbidden = ["@lovable.dev/", "ai.gateway.lovable.dev", "LOVABLE_API_KEY"];
const findings = [];

for (const file of candidates) {
  const content = await readFile(file, "utf8");
  for (const value of forbidden) {
    if (content.includes(value)) findings.push(`${file}: ${value}`);
  }
}

if (findings.length > 0) {
  console.error(`Forbidden runtime coupling found:\n${findings.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Checked ${candidates.length} runtime and manifest files: no forbidden coupling found.`);
}

async function findFiles(root, exactName) {
  const output = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) output.push(...(await findFiles(path, exactName)));
    else if (!exactName || entry.name === exactName) output.push(path);
  }
  return output;
}
