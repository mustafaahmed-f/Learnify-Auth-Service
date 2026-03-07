// scripts/generate-commit.ts
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const typeIcons: Record<string, string> = {
  feat: "✨",
  fix: "🐛",
  chore: "🔧",
  refactor: "♻️",
  docs: "📝",
  test: "✅",
  style: "🎨",
  perf: "⚡",
};

const args = process.argv.slice(2); // ['feat', 'auth', 'add login flow']
const [type, scope, ...messageParts] = args;

//// check if type is one of the keys of typeIcons:
if (!Object.keys(typeIcons).includes(type)) {
  console.log("❌ Invalid type:", type);
  process.exit(1);
}

if (!type || !scope || messageParts.length === 0) {
  console.log(`❌ Usage: ts-node scripts/generate-commit.ts <type> <scope> <message>`);
  process.exit(1);
}

const icon = typeIcons[type] || "";
const message = messageParts.join(" ");

// Final format
const commitMessage = `${icon} ${type}(${scope}): ${message}`;

console.log("✅ Generated Commit Message:");
console.log(commitMessage);

// Save to .git/COMMIT_EDITMSG
const gitPath = path.resolve(process.cwd(), ".git/COMMIT_EDITMSG");
fs.writeFileSync(gitPath, commitMessage);

const commitMessageFilePath = ".git/COMMIT_EDITMSG"; // or the actual variable/path you have

execSync(`git commit -F "${commitMessageFilePath}"`, { stdio: "inherit" });
