"use client";

import { useEffect, useState } from "react";
import WorldMap from "../components/WorldMap";
import { AlertTriangle, Globe, MapPin, ShieldAlert, Truck } from "lucide-react";

interface Article {
  title: string;
  link: string;
  date: string;
  source: string;
  summary: string;
  category: string;
  region: string;
  lat: number;
  lng: number;
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium">Loading OSINT Intelligence...</p>
        </div>
      </div>
    );
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Cyber Attack': return <ShieldAlert className="w-4 h-4 text-red-400" />;
      case 'Supply Chain': return <Truck className="w-4 h-4 text-yellow-400" />;
      case 'Geopolitics': return <Globe className="w-4 h-4 text-blue-400" />;
      default: return <AlertTriangle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Cyber Attack': return 'bg-red-500/10 text-red-400 ring-red-500/20';
      case 'Supply Chain': return 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20';
      case 'Geopolitics': return 'bg-blue-500/10 text-blue-400 ring-blue-500/20';
      default: return 'bg-slate-500/10 text-slate-400 ring-slate-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200 selection:bg-blue-500/30">
      <header className="bg-slate-900 border-b border-slate-800 py-6 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Globe className="w-8 h-8 text-blue-500" />
              Global OSINT Risk Monitor
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Automated Geopolitical & Cyber Threat Intelligence powered by AI.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              Live Updates Active
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Map Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Global Threat Map</h2>
            <span className="text-xs font-medium bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700">
              Updated: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : "Unknown"}
            </span>
          </div>
          <WorldMap articles={data?.articles || []} />
        </section>

        {/* Intelligence Feed */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Recent Intelligence Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.articles && data.articles.length > 0 ? (
              data.articles.map((article, idx) => (
                <div key={idx} className="bg-slate-900 shadow-sm ring-1 ring-slate-800 rounded-xl p-5 hover:ring-slate-700 transition-all">
                  
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getCategoryColor(article.category)}`}>
                      {getCategoryIcon(article.category)}
                      {article.category}
                    </span>
                    <time className="text-xs text-slate-500 whitespace-nowrap">
                      {new Date(article.date).toLocaleDateString()}
                    </time>
                  </div>

                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-lg font-semibold text-slate-100 hover:text-blue-400 transition-colors mb-2 line-clamp-2"
                  >
                    {article.title}
                  </a>

                  <div className="flex items-center gap-3 mb-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-md">
                      <Globe className="w-3 h-3" />
                      {article.source}
                    </span>
                    {article.region && (
                      <span className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-md">
                        <MapPin className="w-3 h-3" />
                        {article.region}
                      </span>
                    )}
                  </div>

                  <div className="p-4 rounded-lg bg-slate-950/50 border border-slate-800/50">
                    <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      AI Impact Analysis
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {article.summary}
                    </p>
                  </div>

                </div>
              ))
            ) : (
              <div className="col-span-full p-8 text-center text-slate-500 bg-slate-900 rounded-xl ring-1 ring-slate-800">
                <ShieldAlert className="w-8 h-8 mx-auto mb-3 text-slate-600" />
                <p>No intelligence reports available at this time.</p>
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
