/**
 * Bright Data Web Unlocker — fetches any URL reliably.
 * Handles anti-bot, CAPTCHAs, JS rendering. We just send a URL, get HTML back.
 */

const BD_ENDPOINT = "https://api.brightdata.com/request";

export async function scrape(url: string): Promise<string> {
    const token = process.env.BRIGHTDATA_API_TOKEN;
    const zone = process.env.BRIGHTDATA_ZONE;

    if (!token) throw new Error("Missing BRIGHTDATA_API_TOKEN in .env");

    const res = await fetch(BD_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ zone, url, format: "raw" }),
    });

    if (!res.ok) {
        throw new Error(`Bright Data error ${res.status}: ${await res.text()}`);
    }

    return res.text();
}

/**
 * Scrape a page and strip it down to just the text content.
 * Removes scripts, styles, and HTML tags — gives Claude clean text to work with.
 */
export async function scrapeAsText(url: string): Promise<string> {
    const html = await scrape(url);
    return stripHtml(html);
}

function stripHtml(html: string): string {
    // Remove script/style blocks entirely
    let text = html.replace(/<script[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
    text = text.replace(/<nav[\s\S]*?<\/nav>/gi, "");
    text = text.replace(/<footer[\s\S]*?<\/footer>/gi, "");
    text = text.replace(/<header[\s\S]*?<\/header>/gi, "");

    // Replace block elements with newlines
    text = text.replace(/<\/(p|div|h[1-6]|li|tr|br\s*\/?)>/gi, "\n");
    text = text.replace(/<br\s*\/?>/gi, "\n");

    // Strip remaining tags
    text = text.replace(/<[^>]+>/g, "");

    // Decode HTML entities
    text = text.replace(/&amp;/g, "&");
    text = text.replace(/&lt;/g, "<");
    text = text.replace(/&gt;/g, ">");
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    text = text.replace(/&nbsp;/g, " ");

    // Clean up whitespace
    text = text.replace(/[ \t]+/g, " ");
    text = text.replace(/\n\s*\n/g, "\n");
    text = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .join("\n");

    // Truncate to ~15k chars so we don't blow up Claude's context
    return text.slice(0, 15000);
}
