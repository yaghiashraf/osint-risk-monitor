"use client";

import { useEffect, useState } from "react";

interface Article {
  title: string;
  link: string;
  date: string;
  source: string;
  analysis: string;
}

interface Data {
  lastUpdated: string;
  articles: Article[];
}

export default function Home() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/data/latest_insights.json")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load insights:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 font-medium">Loading AI Risk Analysis...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-white shadow-sm py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Geopolitical Risk & Supply Chain Monitor
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Automated OSINT analysis powered by Hugging Face AI.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">Latest Intelligence Reports</h2>
          <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200">
            Last updated: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : "Unknown"}
          </span>
        </div>

        <div className="space-y-6">
          {data?.articles && data.articles.length > 0 ? (
            data.articles.map((article, idx) => (
              <div key={idx} className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                    {article.source}
                  </span>
                  <time className="text-xs text-slate-500">
                    {new Date(article.date).toLocaleDateString()}
                  </time>
                </div>
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-lg font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                >
                  {article.title}
                </a>
                <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-100">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    AI Business Impact Analysis
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {article.analysis}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-500">No articles available.</p>
          )}
        </div>
      </main>
    </div>
  );
}
