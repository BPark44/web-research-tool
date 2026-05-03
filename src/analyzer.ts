/**
 * Claude-powered analysis — takes raw scraped text and extracts
 * structured product data from it. This is the "brain" of the tool.
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface Product {
    name: string;
    url: string;
    pricing: string;
    freeTier: string;
    keyFeatures: string[];
    bestFor: string;
    verdict: string;
}

export interface ResearchResult {
    query: string;
    summary: string;
    products: Product[];
    recommendation: string;
    timestamp: string;
}

/**
 * Given a search query and scraped text from multiple pages,
 * have Claude extract structured product comparisons.
 */
export async function analyzeProducts(
    query: string,
    scrapedPages: { url: string; text: string }[]
): Promise<ResearchResult> {
    const pagesContext = scrapedPages
        .map(
            (p, i) =>
                `--- PAGE ${i + 1}: ${p.url} ---\n${p.text.slice(
                    0,
                    8000
                )}\n--- END PAGE ${i + 1} ---`
        )
        .join("\n\n");

    const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [
            {
                role: "user",
                content: `You are a product research assistant. I scraped several web pages related to this query: "${query}"

Here is the raw text from each page:

${pagesContext}

Analyze these pages and extract structured product information. Return ONLY valid JSON (no markdown, no code fences) in this exact format:

{
  "summary": "One paragraph overview of the product landscape for this query",
  "products": [
    {
      "name": "Product Name",
      "url": "https://product-website.com",
      "pricing": "Brief pricing summary (e.g. 'Free tier, Pro $20/mo, Enterprise custom')",
      "freeTier": "What's included free, or 'None'",
      "keyFeatures": ["Feature 1", "Feature 2", "Feature 3"],
      "bestFor": "Who this product is best suited for",
      "verdict": "One sentence honest take"
    }
  ],
  "recommendation": "Your overall recommendation based on the data — which product for which use case"
}

Rules:
- Only include products you found real data for in the scraped pages
- If pricing isn't on the page, say "See website" — don't guess
- Keep features to 3-5 per product, pick the most important ones
- Be honest and specific in verdicts, not generic marketing speak
- Extract the product's actual URL, not the article URL
- If a page is a listicle/article, extract info about each product mentioned in it
- Return 3-6 products maximum, ranked by relevance to the query`,
            },
        ],
    });

    const text =
        response.content[0].type === "text" ? response.content[0].text : "";

    // Parse Claude's JSON response
    let parsed: any;
    try {
        // Try to extract JSON if Claude wrapped it in code fences anyway
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
        throw new Error(
            `Failed to parse Claude's response as JSON:\n${text.slice(0, 500)}`
        );
    }

    return {
        query,
        summary: parsed.summary || "",
        products: parsed.products || [],
        recommendation: parsed.recommendation || "",
        timestamp: new Date().toISOString(),
    };
}

/**
 * Given a query, have Claude generate the best Google search URLs
 * to find relevant product pages.
 */
export async function generateSearchQueries(query: string): Promise<string[]> {
    const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [
            {
                role: "user",
                content: `I want to research: "${query}"

Generate 3 Google search URLs that would find the best product comparison pages, pricing pages, and review articles for this query. I need URLs that will return actual product information, not just blog spam.

Return ONLY a JSON array of search URL strings, no other text:
["https://www.google.com/search?q=...", "https://www.google.com/search?q=...", "https://www.google.com/search?q=..."]

Make the queries specific. For example:
- Include "pricing" or "vs" or "comparison" or "review 2026"
- Target specific products if the category is obvious
- One query should target a listicle/roundup article`,
            },
        ],
    });

    const text =
        response.content[0].type === "text" ? response.content[0].text : "";

    try {
        const match = text.match(/\[[\s\S]*\]/);
        return JSON.parse(match ? match[0] : text);
    } catch {
        // Fallback: construct a basic search URL
        const q = encodeURIComponent(query + " comparison pricing 2026");
        return [`https://www.google.com/search?q=${q}&num=10`];
    }
}

/**
 * Given Google search results HTML, have Claude pick the best URLs to scrape.
 */
export async function pickBestUrls(
    query: string,
    searchResultsText: string
): Promise<string[]> {
    const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [
            {
                role: "user",
                content: `I searched Google for: "${query}"

Here are the search results (raw text from the page):

${searchResultsText.slice(0, 6000)}

Pick the 3-5 best URLs to scrape for product research. I want:
1. At least one comparison/listicle article (these give an overview of multiple products)
2. At least one or two actual product/pricing pages (the vendor's own website)
3. Skip Reddit, Quora, YouTube, Wikipedia, and social media

Return ONLY a JSON array of URLs, no other text:
["https://example.com/article", "https://vendor.com/pricing", ...]`,
            },
        ],
    });

    const text =
        response.content[0].type === "text" ? response.content[0].text : "";

    try {
        const match = text.match(/\[[\s\S]*\]/);
        return JSON.parse(match ? match[0] : text);
    } catch {
        return [];
    }
}
