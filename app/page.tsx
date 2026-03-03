"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";

const WorldMap = dynamic(() => import("../components/WorldMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[460px] bg-slate-900/50 rounded-2xl ring-1 ring-slate-800/50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
    </div>
  ),
});
import {
  AlertTriangle,
  Clock,
  ExternalLink,
  Filter,
  Globe,
  MapPin,
  Search,
  ShieldAlert,
  Truck,
  X,
  Activity,
  TrendingUp,
} from "lucide-react";

interface Article {
  title: string;
  link: string;
  date: string;
  source: string;
  summary: string;
  category: string;
  severity?: string;
  region: string;
  lat: number;
  lng: number;
}

interface Data {
  lastUpdated: string;
  articles: Article[];
}

type CategoryFilter = "all" | "Cyber Attack" | "Supply Chain" | "Geopolitics";
type SeverityFilter = "all" | "critical" | "high" | "medium";

export default function Home() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Update "now" every minute for relative time display
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

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

  const filteredArticles = useMemo(() => {
    if (!data?.articles) return [];
    return data.articles.filter((article) => {
      if (categoryFilter !== "all" && article.category !== categoryFilter)
        return false;
      if (
        severityFilter !== "all" &&
        (article.severity || "medium") !== severityFilter
      )
        return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          article.title.toLowerCase().includes(q) ||
          article.summary.toLowerCase().includes(q) ||
          article.region.toLowerCase().includes(q) ||
          article.source.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, categoryFilter, severityFilter, searchQuery]);

  const stats = useMemo(() => {
    if (!data?.articles) return { cyber: 0, supply: 0, geo: 0, critical: 0 };
    return {
      cyber: data.articles.filter((a) => a.category === "Cyber Attack").length,
      supply: data.articles.filter((a) => a.category === "Supply Chain").length,
      geo: data.articles.filter((a) => a.category === "Geopolitics").length,
      critical: data.articles.filter((a) => a.severity === "critical").length,
    };
  }, [data]);

  const hasActiveFilters =
    categoryFilter !== "all" || severityFilter !== "all" || searchQuery !== "";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-12 h-12 border-[3px] border-slate-800 rounded-full" />
            <div className="w-12 h-12 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin absolute inset-0" />
          </div>
          <div className="text-center">
            <p className="text-slate-300 font-medium">
              Loading Intelligence Feed
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Fetching latest threat data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getCategoryIcon = (category: string, size = "w-4 h-4") => {
    switch (category) {
      case "Cyber Attack":
        return <ShieldAlert className={`${size} text-red-400`} />;
      case "Supply Chain":
        return <Truck className={`${size} text-amber-400`} />;
      case "Geopolitics":
        return <Globe className={`${size} text-blue-400`} />;
      default:
        return <AlertTriangle className={`${size} text-slate-400`} />;
    }
  };

  const getCategoryStyle = (category: string) => {
    switch (category) {
      case "Cyber Attack":
        return "bg-red-500/10 text-red-400 ring-red-500/20";
      case "Supply Chain":
        return "bg-amber-500/10 text-amber-400 ring-amber-500/20";
      case "Geopolitics":
        return "bg-blue-500/10 text-blue-400 ring-blue-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 ring-slate-500/20";
    }
  };

  const getSeverityStyle = (severity?: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/15 text-red-400 border-red-500/30";
      case "high":
        return "bg-orange-500/15 text-orange-400 border-orange-500/30";
      case "medium":
        return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-slate-500/15 text-slate-400 border-slate-500/30";
    }
  };

  const getRelativeTime = (dateStr: string) => {
    const diff = now - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return "Just now";
  };

  const clearFilters = () => {
    setCategoryFilter("all");
    setSeverityFilter("all");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200 selection:bg-blue-500/30">
      {/* Header */}
      <header className="bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                OSINT Risk Monitor
              </h1>
              <p className="text-xs text-slate-500">
                AI-Powered Threat Intelligence
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:block">
              {data?.lastUpdated
                ? `Updated ${getRelativeTime(data.lastUpdated)}`
                : ""}
            </span>
            <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-emerald-400">Live</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() =>
              setCategoryFilter(
                categoryFilter === "Cyber Attack" ? "all" : "Cyber Attack",
              )
            }
            className={`group relative overflow-hidden rounded-xl p-4 text-left transition-all ${
              categoryFilter === "Cyber Attack"
                ? "bg-red-500/15 ring-2 ring-red-500/40"
                : "bg-slate-900/50 ring-1 ring-slate-800/50 hover:ring-slate-700/50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <span className="text-2xl font-bold text-white">
                {stats.cyber}
              </span>
            </div>
            <p className="text-xs text-slate-400">Cyber Attacks</p>
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </button>

          <button
            onClick={() =>
              setCategoryFilter(
                categoryFilter === "Supply Chain" ? "all" : "Supply Chain",
              )
            }
            className={`group relative overflow-hidden rounded-xl p-4 text-left transition-all ${
              categoryFilter === "Supply Chain"
                ? "bg-amber-500/15 ring-2 ring-amber-500/40"
                : "bg-slate-900/50 ring-1 ring-slate-800/50 hover:ring-slate-700/50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Truck className="w-5 h-5 text-amber-400" />
              <span className="text-2xl font-bold text-white">
                {stats.supply}
              </span>
            </div>
            <p className="text-xs text-slate-400">Supply Chain</p>
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </button>

          <button
            onClick={() =>
              setCategoryFilter(
                categoryFilter === "Geopolitics" ? "all" : "Geopolitics",
              )
            }
            className={`group relative overflow-hidden rounded-xl p-4 text-left transition-all ${
              categoryFilter === "Geopolitics"
                ? "bg-blue-500/15 ring-2 ring-blue-500/40"
                : "bg-slate-900/50 ring-1 ring-slate-800/50 hover:ring-slate-700/50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Globe className="w-5 h-5 text-blue-400" />
              <span className="text-2xl font-bold text-white">
                {stats.geo}
              </span>
            </div>
            <p className="text-xs text-slate-400">Geopolitical</p>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </button>

          <button
            onClick={() =>
              setSeverityFilter(
                severityFilter === "critical" ? "all" : "critical",
              )
            }
            className={`group relative overflow-hidden rounded-xl p-4 text-left transition-all ${
              severityFilter === "critical"
                ? "bg-red-500/15 ring-2 ring-red-500/40"
                : "bg-slate-900/50 ring-1 ring-slate-800/50 hover:ring-slate-700/50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-red-400" />
              <span className="text-2xl font-bold text-white">
                {stats.critical}
              </span>
            </div>
            <p className="text-xs text-slate-400">Critical Severity</p>
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </button>
        </div>

        {/* Map Section */}
        <section className="animate-fade-in">
          <WorldMap
            articles={filteredArticles}
            onMarkerClick={(article) => setSelectedArticle(article)}
          />
        </section>

        {/* Filters Bar */}
        <section className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search threats, regions, sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-900/50 ring-1 ring-slate-800/50 rounded-xl text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-slate-500" />
            {(["all", "critical", "high", "medium"] as SeverityFilter[]).map(
              (sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    severityFilter === sev
                      ? "bg-slate-700 text-white ring-1 ring-slate-600"
                      : "bg-slate-900/50 text-slate-500 ring-1 ring-slate-800/50 hover:text-slate-300"
                  }`}
                >
                  {sev === "all" ? "All Severity" : sev.charAt(0).toUpperCase() + sev.slice(1)}
                </button>
              ),
            )}

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20 hover:bg-blue-500/20 transition-all"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        </section>

        {/* Intelligence Feed */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">
              Intelligence Reports
              <span className="ml-2 text-sm font-normal text-slate-500">
                ({filteredArticles.length})
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredArticles.length > 0 ? (
              filteredArticles.map((article, idx) => (
                <article
                  key={idx}
                  className={`animate-slide-up group bg-slate-900/40 ring-1 ring-slate-800/40 rounded-2xl p-5 hover:ring-slate-700/60 hover:bg-slate-900/60 transition-all ${
                    selectedArticle?.title === article.title
                      ? "ring-2 ring-blue-500/40 bg-slate-900/70"
                      : ""
                  }`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                  onClick={() => setSelectedArticle(article)}
                >
                  {/* Top row: category + severity + time */}
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getCategoryStyle(article.category)}`}
                      >
                        {getCategoryIcon(article.category, "w-3.5 h-3.5")}
                        {article.category}
                      </span>
                      {article.severity && (
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${getSeverityStyle(article.severity)}`}
                        >
                          {article.severity}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      {getRelativeTime(article.date)}
                    </div>
                  </div>

                  {/* Title */}
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/link flex items-start gap-1 mb-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-[15px] font-semibold text-slate-100 group-hover/link:text-blue-400 transition-colors leading-snug line-clamp-2">
                      {article.title}
                    </h3>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover/link:text-blue-400 transition-colors mt-0.5 shrink-0" />
                  </a>

                  {/* Metadata chips */}
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-800/50 px-2 py-1 rounded-md">
                      <Globe className="w-3 h-3" />
                      {article.source}
                    </span>
                    {article.region && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-800/50 px-2 py-1 rounded-md">
                        <MapPin className="w-3 h-3" />
                        {article.region}
                      </span>
                    )}
                  </div>

                  {/* AI Analysis */}
                  <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/30">
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-1 h-1 rounded-full bg-blue-400" />
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        AI Risk Analysis
                      </span>
                    </div>
                    <p className="text-[13px] text-slate-400 leading-relaxed">
                      {article.summary}
                    </p>
                  </div>
                </article>
              ))
            ) : (
              <div className="col-span-full p-12 text-center bg-slate-900/30 rounded-2xl ring-1 ring-slate-800/30">
                <ShieldAlert className="w-10 h-10 mx-auto mb-4 text-slate-700" />
                <p className="text-slate-400 font-medium">
                  No reports match your filters
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  Try adjusting your search or filter criteria
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20 hover:bg-blue-500/20 transition-all"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/30 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Activity className="w-3.5 h-3.5" />
            <span>
              OSINT Risk Monitor &middot; Automated threat intelligence
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span>
              Sources: BBC, CNBC, Hacker News, CISA
            </span>
            <span>&middot;</span>
            <span>
              Analysis: Llama 3.2 via HuggingFace
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
