import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const offenders = [];

function walk(p) {
  for (const f of readdirSync(p)) {
    const full = join(p, f);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full);
    } else if (/\.(tsx?|css|html|md|js|json)$/.test(full)) {
      const s = readFileSync(full, "utf8");
      if (s.includes("...") || /[A-Za-z]{2,}\n[A-Za-z]{2,}/.test(s)) {
        offenders.push(full);
      }
    }
  }
}

walk("src");

// Check special files
if (["index.html", "src/index.css"].some(f => {
  try {
    return readFileSync(f, "utf8").includes("...");
  } catch (e) {
    return false;
  }
})) {
  offenders.push("index.html/src/index.css");
}

if (offenders.length) {
  console.error("Corrupted sources:\n" + offenders.join("\n"));
  process.exit(1);
}

console.log("✅ No corruption detected");