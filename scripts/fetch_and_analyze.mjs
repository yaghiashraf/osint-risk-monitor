import fs from 'fs';
import path from 'path';
import Parser from 'rss-parser';
import { HfInference } from '@huggingface/inference';
import dotenv from 'dotenv';

dotenv.config();

const hf = new HfInference(process.env.HF_TOKEN);
const parser = new Parser();

// RSS Feeds to monitor - added Cyber and Major Updates
const FEEDS = [
  { url: 'http://feeds.bbci.co.uk/news/world/middle_east/rss.xml', source: 'BBC Middle East', type: 'Geopolitics' },
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664', source: 'CNBC Finance', type: 'Supply Chain' },
  { url: 'https://feeds.feedburner.com/TheHackersNews', source: 'The Hacker News', type: 'Cyber Attack' },
  { url: 'https://www.cisa.gov/uscert/ncas/current-activity.xml', source: 'CISA Alerts', type: 'Cyber Attack' }
];

const DATA_FILE = path.join(process.cwd(), 'public', 'data', 'latest_insights.json');
const MAX_ARTICLES_PER_FEED = 3;

async function analyzeArticle(title, contentSnippet, feedType) {
  const prompt = `
Analyze the following news article title and snippet. Extract business/supply chain risks, geopolitical impacts, or cyber attack threats.
Provide your response ONLY as a valid JSON object with the following exact keys. Do not include markdown formatting like \`\`\`json.
{
  "summary": "A concise 2-3 sentence business/security impact summary.",
  "category": "Cyber Attack" or "Supply Chain" or "Geopolitics",
  "region": "The country, region, or 'Global' where this event is taking place",
  "lat": a rough float latitude of the region (e.g. 35.8 for Middle East, 38.9 for Washington DC if US cyber. Use 0 if completely unknown),
  "lng": a rough float longitude of the region (use 0 if completely unknown)
}

Title: ${title}
Snippet: ${contentSnippet || "No snippet available."}
`;
  
  try {
    const res = await hf.chatCompletion({
      model: "meta-llama/Llama-3.2-1B-Instruct",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 250,
      temperature: 0.1
    });

    let content = res.choices[0].message.content.trim();
    // Clean up potential markdown formatting from AI output
    if (content.startsWith('```json')) content = content.replace('```json', '');
    if (content.startsWith('```')) content = content.replace('```', '');
    if (content.endsWith('```')) content = content.substring(0, content.length - 3);
    
    return JSON.parse(content.trim());
  } catch (err) {
    console.error(`HF API Error or Parsing failed for "${title}":`, err.message);
    return {
      summary: "Error generating analysis.",
      category: feedType,
      region: "Unknown",
      lat: 0,
      lng: 0
    };
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
        const analysisData = await analyzeArticle(item.title, item.contentSnippet, feedConfig.type);
        
        articlesData.push({
          title: item.title,
          link: item.link,
          date: item.pubDate || new Date().toISOString(),
          source: feedConfig.source,
          summary: analysisData.summary || "No summary available.",
          category: analysisData.category || feedConfig.type,
          region: analysisData.region || "Global",
          lat: analysisData.lat || 0,
          lng: analysisData.lng || 0
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
