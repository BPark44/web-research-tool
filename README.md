# Web Research Tool

Research any product category from the command line. Bright Data scrapes the web, Claude analyzes the results.

Give it a query → it searches Google → scrapes the best pages → Claude extracts structured comparisons.

![screenshot](examples/screenshot.png)

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/web-research-tool.git
cd web-research-tool
cp .env.example .env
# Add your API keys to .env
npm install
npx tsx src/index.ts "best cloud hosting for side projects"
```

## How It Works

1. **Claude generates search queries** tailored to your research topic
2. **Bright Data scrapes Google** via Web Unlocker (handles anti-bot, CAPTCHAs)
3. **Claude picks the best URLs** from search results (vendor pages, comparisons)
4. **Bright Data scrapes each page** and extracts clean text
5. **Claude analyzes everything** and outputs structured product comparisons with pricing, features, and recommendations

## Setup

You need two API keys:

| Key | Where to get it | What it does |
|-----|----------------|--------------|
| `BRIGHTDATA_API_TOKEN` | [brightdata.com](https://brightdata.com) → Settings → API Keys | Scrapes the web reliably |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) | Analyzes scraped data |

You also need a Bright Data Web Unlocker zone (default name: `web_unlocker1`).

## Output

After running, check `examples/`:
- `output.json` — structured comparison data
- `comparison.html` — visual HTML report

## Built With

- [Bright Data Web Unlocker](https://brightdata.com/products/web-unlocker) — reliable web scraping
- [Claude API](https://console.anthropic.com) — intelligent data extraction
- TypeScript / Node.js
