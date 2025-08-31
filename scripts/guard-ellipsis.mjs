import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const offenders = [];
const RX = /\.(tsx?|css|html|md|js|json)$/;

function scan(file) {
  try {
    const s = readFileSync(file, "utf8");
    if (s.includes("...") || /[A-Za-z]{2,}\n[A-Za-z]{2,}/.test(s)) {
      offenders.push(file);
    }
  } catch (e) {
    // File might not exist, skip
  }
}

function walk(p) {
  try {
    for (const f of readdirSync(p)) {
      const full = join(p, f);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
      } else if (RX.test(full)) {
        scan(full);
      }
    }
  } catch (e) {
    // Directory might not exist, skip
  }
}

// Scan source files
walk("src");

// Check specific config files
[
  "index.html",
  "src/index.css", 
  "vite.config.ts",
  "tsconfig.json",
  "tsconfig.app.json",
  "tsconfig.node.json"
].forEach(f => scan(f));

if (offenders.length) {
  console.error("Corrupted sources:\n" + offenders.join("\n"));
  process.exit(1);
}

console.log("✅ No corruption detected");