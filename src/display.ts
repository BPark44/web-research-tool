/**
 * Terminal + HTML output formatting.
 */

import type { ResearchResult } from "./analyzer.js";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const WHITE = "\x1b[37m";

export function displayResults(result: ResearchResult): void {
  console.log();
  console.log(`${BOLD}${CYAN}═══ Research Results: ${result.query} ═══${RESET}`);
  console.log();
  console.log(`${DIM}${result.summary}${RESET}`);
  console.log();

  // Table header
  const divider = `${DIM}${"─".repeat(90)}${RESET}`;
  console.log(divider);
  console.log(
    `${BOLD} ${"Product".padEnd(18)} ${"Pricing".padEnd(24)} ${"Free Tier".padEnd(16)} Best For${RESET}`
  );
  console.log(divider);

  for (const p of result.products) {
    console.log(
      ` ${WHITE}${BOLD}${p.name.padEnd(18)}${RESET} ${GREEN}${p.pricing.slice(0, 23).padEnd(24)}${RESET} ${YELLOW}${(p.freeTier || "—").slice(0, 15).padEnd(16)}${RESET} ${DIM}${p.bestFor.slice(0, 30)}${RESET}`
    );
    if (p.keyFeatures.length > 0) {
      console.log(
        `${DIM}  └ ${p.keyFeatures.slice(0, 3).join(" · ")}${RESET}`
      );
    }
    if (p.verdict) {
      console.log(`${DIM}  └ Verdict: ${p.verdict}${RESET}`);
    }
    console.log();
  }

  console.log(divider);
  console.log();
  console.log(`${BOLD}${GREEN}Recommendation:${RESET} ${result.recommendation}`);
  console.log();
}

export function saveOutputs(result: ResearchResult): void {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const examplesDir = join(__dirname, "..", "examples");
  mkdirSync(examplesDir, { recursive: true });

  // JSON
  writeFileSync(
    join(examplesDir, "output.json"),
    JSON.stringify(result, null, 2)
  );

  // HTML
  writeFileSync(
    join(examplesDir, "comparison.html"),
    generateHtml(result)
  );

  console.log(`${DIM}Saved: examples/output.json & examples/comparison.html${RESET}`);
}

function generateHtml(result: ResearchResult): string {
  const productRows = result.products
    .map(
      (p) => `
    <tr>
      <td>
        <strong><a href="${p.url}" target="_blank">${p.name}</a></strong>
        <div class="verdict">${p.verdict}</div>
      </td>
      <td class="pricing">${p.pricing}</td>
      <td class="free-tier">${p.freeTier || "—"}</td>
      <td class="features">${p.keyFeatures.map((f) => `<div>• ${f}</div>`).join("")}</td>
      <td class="best-for">${p.bestFor}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Research: ${result.query}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0d1117; color: #e6edf3; font-family: -apple-system, 'Segoe UI', sans-serif; padding: 2rem; }
  h1 { font-size: 1.5rem; color: #58a6ff; margin-bottom: 0.3rem; }
  .meta { color: #8b949e; font-size: 0.85rem; margin-bottom: 1rem; }
  .summary { color: #c9d1d9; font-size: 0.9rem; line-height: 1.6; margin-bottom: 1.5rem; max-width: 800px; }
  table { width: 100%; border-collapse: collapse; background: #161b22; border-radius: 8px; overflow: hidden; }
  th { background: #21262d; color: #58a6ff; text-align: left; padding: 12px 14px; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 14px; border-bottom: 1px solid #21262d; font-size: 0.85rem; line-height: 1.5; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  tr:hover { background: #1c2128; }
  a { color: #58a6ff; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .pricing { color: #3fb950; font-weight: 600; }
  .free-tier { color: #d29922; }
  .features { color: #c9d1d9; font-size: 0.8rem; }
  .best-for { color: #8b949e; font-size: 0.8rem; }
  .verdict { color: #8b949e; font-size: 0.75rem; margin-top: 4px; font-style: italic; }
  .recommendation { margin-top: 1.5rem; padding: 1rem; background: #1f6feb15; border: 1px solid #1f6feb33; border-radius: 8px; color: #c9d1d9; font-size: 0.9rem; line-height: 1.5; }
  .recommendation strong { color: #58a6ff; }
  .badge { display: inline-block; background: #1f6feb22; color: #58a6ff; padding: 3px 10px; border-radius: 4px; font-size: 0.75rem; margin-bottom: 1rem; border: 1px solid #1f6feb44; }
  .footer { margin-top: 1.5rem; color: #484f58; font-size: 0.7rem; }
</style>
</head>
<body>
  <span class="badge">Built with Bright Data + Claude</span>
  <h1>${result.query}</h1>
  <p class="meta">${new Date(result.timestamp).toLocaleDateString()} · ${result.products.length} products compared</p>
  <p class="summary">${result.summary}</p>
  <table>
    <thead><tr><th>Product</th><th>Pricing</th><th>Free Tier</th><th>Features</th><th>Best For</th></tr></thead>
    <tbody>${productRows}</tbody>
  </table>
  <div class="recommendation"><strong>Recommendation:</strong> ${result.recommendation}</div>
  <p class="footer">Scraped by Bright Data Web Unlocker · Analyzed by Claude</p>
</body>
</html>`;
}
