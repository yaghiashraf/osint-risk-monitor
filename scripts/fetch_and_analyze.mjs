import fs from 'fs';
import path from 'path';
import Parser from 'rss-parser';
import { HfInference } from '@huggingface/inference';
import dotenv from 'dotenv';

dotenv.config();

const hf = new HfInference(process.env.HF_TOKEN);
const parser = new Parser();

// RSS Feeds to monitor
const FEEDS = [
  { url: 'http://feeds.bbci.co.uk/news/world/middle_east/rss.xml', source: 'BBC Middle East' },
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664', source: 'CNBC Finance' }
];

const DATA_FILE = path.join(process.cwd(), 'public', 'data', 'latest_insights.json');
const MAX_ARTICLES_PER_FEED = 3;

async function analyzeArticle(title, contentSnippet) {
  const prompt = `
Analyze the following news article title and snippet. Extract any mentions of delayed shipping routes, changes in commodity prices, shifts in regional trade policies, or general economic/business impacts. Provide a concise 2-3 sentence business risk summary. If there is no business impact, output exactly "No direct economic or supply chain impact identified."

Title: ${title}
Snippet: ${contentSnippet || "No snippet available."}
`;
  try {
    const res = await hf.chatCompletion({
      model: "google/gemma-2-2b-it",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      temperature: 0.2
    });
    return res.choices[0].message.content.trim();
  } catch (err) {
    console.error(`HF API Error for "${title}":`, err.message);
    return "Error generating analysis.";
  }
}

async function main() {
  console.log("Starting OSINT Data Fetch & Analysis...");
  let articlesData = [];

  for (const feedConfig of FEEDS) {
    console.log(`Fetching RSS feed: ${feedConfig.source}...`);
    try {
      const feed = await parser.parseURL(feedConfig.url);
      const items = feed.items.slice(0, MAX_ARTICLES_PER_FEED);

      for (const item of items) {
        console.log(`Analyzing: ${item.title}`);
        const analysis = await analyzeArticle(item.title, item.contentSnippet);
        
        articlesData.push({
          title: item.title,
          link: item.link,
          date: item.pubDate || new Date().toISOString(),
          source: feedConfig.source,
          analysis: analysis
        });
      }
    } catch (err) {
      console.error(`Error parsing feed ${feedConfig.source}:`, err.message);
    }
  }

  const finalData = {
    lastUpdated: new Date().toISOString(),
    articles: articlesData
  };

  fs.writeFileSync(DATA_FILE, JSON.stringify(finalData, null, 2));
  console.log(`Saved insights to ${DATA_FILE}`);
}

main().catch(console.error);
