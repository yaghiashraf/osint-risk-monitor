import fs from 'fs';
import path from 'path';
import Parser from 'rss-parser';
import { HfInference } from '@huggingface/inference';
import dotenv from 'dotenv';

dotenv.config();

const HF_TOKEN = process.env.HF_TOKEN;
const hf = HF_TOKEN ? new HfInference(HF_TOKEN) : null;
const AI_ENABLED = !!hf;

if (!AI_ENABLED) {
  console.warn("WARNING: HF_TOKEN not set. Will fetch real RSS data but skip AI analysis (using feed snippets instead).");
}

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'OSINT-Risk-Monitor/1.0',
  },
});

// RSS Feeds to monitor
const FEEDS = [
  { url: 'http://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC World', type: 'Geopolitics' },
  { url: 'http://feeds.bbci.co.uk/news/world/middle_east/rss.xml', source: 'BBC Middle East', type: 'Geopolitics' },
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664', source: 'CNBC Finance', type: 'Supply Chain' },
  { url: 'https://feeds.feedburner.com/TheHackersNews', source: 'The Hacker News', type: 'Cyber Attack' },
  { url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml', source: 'CISA Advisories', type: 'Cyber Attack' },
  { url: 'https://krebsonsecurity.com/feed/', source: 'Krebs on Security', type: 'Cyber Attack' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', source: 'NY Times World', type: 'Geopolitics' },
];

const DATA_FILE = path.join(process.cwd(), 'public', 'data', 'latest_insights.json');
const MAX_ARTICLES_PER_FEED = 3;
const RATE_LIMIT_DELAY_MS = 1500;

// Simple rate limiter
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Well-known region coordinates for fallback
const REGION_COORDS = {
  'united states': { lat: 39.8, lng: -98.6 },
  'us': { lat: 39.8, lng: -98.6 },
  'china': { lat: 35.9, lng: 104.2 },
  'russia': { lat: 61.5, lng: 105.3 },
  'ukraine': { lat: 48.4, lng: 31.2 },
  'israel': { lat: 31.0, lng: 34.8 },
  'iran': { lat: 32.4, lng: 53.7 },
  'taiwan': { lat: 23.7, lng: 121.0 },
  'north korea': { lat: 40.3, lng: 127.5 },
  'south korea': { lat: 35.9, lng: 127.8 },
  'japan': { lat: 36.2, lng: 138.3 },
  'india': { lat: 20.6, lng: 79.0 },
  'europe': { lat: 50.0, lng: 10.0 },
  'middle east': { lat: 29.0, lng: 41.0 },
  'global': { lat: 20.0, lng: 0.0 },
  'africa': { lat: 1.5, lng: 20.0 },
  'asia': { lat: 34.0, lng: 100.0 },
  'south america': { lat: -15.0, lng: -60.0 },
};

async function analyzeArticle(title, contentSnippet, feedType) {
  // If no AI available, return basic analysis from feed metadata
  if (!AI_ENABLED) {
    const snippet = (contentSnippet || '').slice(0, 300);
    return {
      summary: snippet || `${feedType} event: ${title}`,
      category: feedType,
      severity: 'medium',
      region: 'Global',
      lat: 0,
      lng: 0,
    };
  }

  const snippet = (contentSnippet || '').slice(0, 500);
  const prompt = `You are a threat intelligence analyst. Analyze this news article and respond ONLY with a JSON object, no other text.

Article Title: ${title}
Article Snippet: ${snippet || "No snippet available."}
Feed Category: ${feedType}

Respond with exactly this JSON format (no markdown, no backticks):
{"summary":"2-3 sentence business/security impact analysis","category":"${feedType}","severity":"critical or high or medium","region":"specific country or region name","lat":0.0,"lng":0.0}

For lat/lng: use approximate coordinates of the primary affected region. If global, use lat:20,lng:0.`;

  try {
    const res = await hf.chatCompletion({
      model: "meta-llama/Llama-3.2-3B-Instruct",
      messages: [
        { role: "system", content: "You are a concise JSON-only responder. Output ONLY valid JSON, nothing else." },
        { role: "user", content: prompt }
      ],
      max_tokens: 300,
      temperature: 0.1
    });

    let content = res.choices[0].message.content.trim();

    // Aggressive cleanup of markdown artifacts
    content = content.replace(/```json\s*/gi, '');
    content = content.replace(/```\s*/g, '');
    content = content.replace(/^\s*json\s*/i, '');

    // Extract JSON if surrounded by other text
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }

    const parsed = JSON.parse(content);

    // Validate and fix coordinates
    let { lat, lng } = parsed;
    if ((!lat && !lng) || (lat === 0 && lng === 0)) {
      const regionLower = (parsed.region || '').toLowerCase();
      const fallback = REGION_COORDS[regionLower];
      if (fallback) {
        lat = fallback.lat;
        lng = fallback.lng;
      }
    }

    return {
      summary: parsed.summary || "Analysis unavailable.",
      category: ['Cyber Attack', 'Supply Chain', 'Geopolitics'].includes(parsed.category)
        ? parsed.category : feedType,
      severity: ['critical', 'high', 'medium'].includes(parsed.severity)
        ? parsed.severity : 'medium',
      region: parsed.region || "Global",
      lat: lat || 0,
      lng: lng || 0,
    };
  } catch (err) {
    console.error(`  Analysis failed for "${title.slice(0, 60)}...": ${err.message}`);
    return {
      summary: `${feedType} event detected. Automated analysis pending manual review.`,
      category: feedType,
      severity: 'medium',
      region: "Global",
      lat: 0,
      lng: 0
    };
  }
}

async function main() {
  console.log("=== OSINT Risk Monitor - Data Fetch & Analysis ===");
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Feeds: ${FEEDS.length}`);
  console.log(`Max articles per feed: ${MAX_ARTICLES_PER_FEED}\n`);

  // Load existing data as fallback
  let existingArticles = [];
  try {
    const existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    existingArticles = existing.articles || [];
  } catch { /* no existing data */ }

  let articlesData = [];
  let feedErrors = 0;

  for (const feedConfig of FEEDS) {
    console.log(`[Feed] ${feedConfig.source} (${feedConfig.type})`);
    try {
      const feed = await parser.parseURL(feedConfig.url);
      const items = feed.items.slice(0, MAX_ARTICLES_PER_FEED);
      console.log(`  Found ${feed.items.length} items, processing ${items.length}`);

      for (const item of items) {
        const shortTitle = (item.title || 'Untitled').slice(0, 70);
        console.log(`  Analyzing: ${shortTitle}...`);

        const analysis = await analyzeArticle(item.title, item.contentSnippet, feedConfig.type);

        articlesData.push({
          title: item.title || 'Untitled',
          link: item.link || '#',
          date: item.pubDate || item.isoDate || new Date().toISOString(),
          source: feedConfig.source,
          summary: analysis.summary,
          category: analysis.category,
          severity: analysis.severity,
          region: analysis.region,
          lat: analysis.lat,
          lng: analysis.lng,
        });

        // Rate limit to avoid HF throttling
        await delay(RATE_LIMIT_DELAY_MS);
      }
    } catch (err) {
      console.error(`  [ERROR] Feed failed: ${err.message}`);
      feedErrors++;
    }
  }

  // If we got fewer than 3 articles due to failures, keep some existing ones
  if (articlesData.length < 3 && existingArticles.length > 0) {
    console.log(`\nWARNING: Only ${articlesData.length} new articles. Keeping existing data as supplement.`);
    const existingTitles = new Set(articlesData.map(a => a.title));
    for (const old of existingArticles) {
      if (!existingTitles.has(old.title) && articlesData.length < 10) {
        articlesData.push(old);
      }
    }
  }

  // Deduplicate by title
  const seen = new Set();
  articlesData = articlesData.filter(a => {
    if (seen.has(a.title)) return false;
    seen.add(a.title);
    return true;
  });

  // Sort by date, newest first
  articlesData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const finalData = {
    lastUpdated: new Date().toISOString(),
    articles: articlesData,
  };

  // Ensure output directory exists
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(finalData, null, 2));
  console.log(`\n=== Complete ===`);
  console.log(`Articles: ${articlesData.length}`);
  console.log(`Feed errors: ${feedErrors}`);
  console.log(`Saved to: ${DATA_FILE}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
