import React, { useEffect, useState } from 'react';
import { ShoppingBag, Server, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface HealthStatus {
  status: string;
  uptime: number;
  timestamp: string;
  service: string;
  version: string;
}

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
      const baseUrl = apiUrl.replace(/\/v1\/?$/, '');
      const res = await fetch(`${baseUrl}/health`);
      if (!res.ok) {
        throw new Error(`Health check returned status ${res.status}`);
      }
      const data: HealthStatus = await res.json();
      setHealth(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reach API server');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
              <ShoppingBag className="w-5 h-5 font-bold" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                UrbanBasket
              </span>
              <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Phase 1 Active
              </span>
            </div>
          </div>
          <div className="text-sm text-slate-400">
            Multi-Vendor E-Commerce Platform
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16 flex-1 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400 mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Infrastructure & Baseline Setup
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          Amazon-Style Multi-Vendor Marketplace
        </h1>
        <p className="text-slate-400 text-base md:text-lg max-w-2xl mb-12">
          Engineered for Customer, Vendor, and Admin roles with Supabase Auth, PostgreSQL, Upstash Redis caching, and automated split payments.
        </p>

        {/* Health status card */}
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl text-left">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <Server className="w-5 h-5 text-slate-400" />
              <h2 className="font-semibold text-sm text-slate-200">Backend API Connectivity</h2>
            </div>
            <button
              onClick={checkHealth}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Refresh connection"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>

          {loading ? (
            <div className="py-6 flex items-center justify-center text-slate-400 text-sm">
              <RefreshCw className="w-5 h-5 animate-spin mr-2 text-emerald-400" />
              Pinging API endpoint...
            </div>
          ) : health ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-medium text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Connected & Healthy</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-slate-400 font-mono">
                <div>
                  <span className="text-slate-500">Service:</span> {health.service}
                </div>
                <div>
                  <span className="text-slate-500">Version:</span> {health.version}
                </div>
                <div>
                  <span className="text-slate-500">Uptime:</span> {Math.round(health.uptime)}s
                </div>
                <div>
                  <span className="text-slate-500">Status:</span> {health.status.toUpperCase()}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-amber-400 font-medium text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Backend Offline or Loading</span>
              </div>
              <p className="text-xs text-slate-400">
                {error || 'Make sure the Express backend server is running on port 5000.'}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-6 text-center text-xs text-slate-500">
        UrbanBasket &bull; React + Vite + Tailwind CSS &bull; Node.js + Express + Prisma + Redis
      </footer>
    </div>
  );
};

export default App;
