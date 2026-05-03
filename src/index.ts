/**
 * Web Research Tool
 * Bright Data scrapes the web. Claude makes sense of it.
 *
 * Usage: npx tsx src/index.ts "best database for serverless apps"
 */

import "dotenv/config";
import {
    analyzeProducts,
    generateSearchQueries,
    pickBestUrls,
} from "./analyzer.js";
import { displayResults, saveOutputs } from "./display.js";
import { scrapeAsText } from "./scraper.js";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";

function log(msg: string) {
    console.log(`  ${msg}`);
}

async function main() {
    const query = process.argv.slice(2).join(" ");

    if (!query) {
        console.log(`
${BOLD}${CYAN}Web Research Tool${RESET}
${DIM}Bright Data scrapes the web. Claude makes sense of it.${RESET}

${BOLD}Usage:${RESET}
  npx tsx src/index.ts ${CYAN}"your research query"${RESET}

${BOLD}Examples:${RESET}
  npx tsx src/index.ts "best cloud hosting for side projects"
  npx tsx src/index.ts "top CI/CD tools for solo developers"
  npx tsx src/index.ts "best headless CMS 2026"
  npx tsx src/index.ts "managed postgres providers comparison"
`);
        process.exit(0);
    }

    // Validate env vars
    if (!process.env.BRIGHTDATA_API_TOKEN) {
        console.error(`${RED}Missing BRIGHTDATA_API_TOKEN in .env${RESET}`);
        process.exit(1);
    }
    if (!process.env.ANTHROPIC_API_KEY) {
        console.error(`${RED}Missing ANTHROPIC_API_KEY in .env${RESET}`);
        process.exit(1);
    }

    console.log();
    console.log(`${BOLD}${CYAN}Researching:${RESET} ${query}`);
    console.log();

    // Step 1: Ask Claude what to search for
    log(`${CYAN}[1/4]${RESET} Generating search queries...`);
    const searchUrls = await generateSearchQueries(query);
    log(`${GREEN}  ✓${RESET} ${searchUrls.length} search queries ready`);

    // Step 2: Scrape Google search results via Bright Data
    log(`${CYAN}[2/4]${RESET} Searching the web via Bright Data...`);
    const searchTexts: string[] = [];
    for (const url of searchUrls.slice(0, 2)) {
        try {
            const text = await scrapeAsText(url);
            searchTexts.push(text);
            log(
                `${GREEN}  ✓${RESET} ${DIM}${decodeURIComponent(
                    new URL(url).searchParams.get("q") || url
                )}${RESET}`
            );
        } catch (e: any) {
            log(
                `${RED}  ✗${RESET} ${DIM}Search failed: ${e.message.slice(
                    0,
                    60
                )}${RESET}`
            );
        }
    }

    if (searchTexts.length === 0) {
        console.error(
            `${RED}All searches failed. Check your Bright Data API token.${RESET}`
        );
        process.exit(1);
    }

    // Step 3: Ask Claude to pick the best URLs from search results, then scrape them
    log(`${CYAN}[3/4]${RESET} Picking best pages & scraping...`);
    const bestUrls = await pickBestUrls(query, searchTexts.join("\n\n"));
    log(`${GREEN}  ✓${RESET} Found ${bestUrls.length} pages to analyze`);

    const scrapedPages: { url: string; text: string }[] = [];
    for (const url of bestUrls.slice(0, 5)) {
        try {
            log(`${DIM}  → Scraping ${new URL(url).hostname}...${RESET}`);
            const text = await scrapeAsText(url);
            scrapedPages.push({ url, text });
            log(`${GREEN}  ✓${RESET} ${DIM}${new URL(url).hostname}${RESET}`);
        } catch (e: any) {
            log(
                `${RED}  ✗${RESET} ${DIM}${
                    new URL(url).hostname
                }: ${e.message.slice(0, 50)}${RESET}`
            );
        }
    }

    if (scrapedPages.length === 0) {
        console.error(`${RED}Couldn't scrape any pages.${RESET}`);
        process.exit(1);
    }

    // Step 4: Send everything to Claude for analysis
    log(
        `${CYAN}[4/4]${RESET} Claude is analyzing ${scrapedPages.length} pages...`
    );
    const result = await analyzeProducts(query, scrapedPages);
    log(
        `${GREEN}  ✓${RESET} Analysis complete — ${result.products.length} products compared`
    );

    // Display and save
    displayResults(result);
    saveOutputs(result);
}

main().catch((err) => {
    console.error(`${RED}Error: ${err.message}${RESET}`);
    process.exit(1);
});
