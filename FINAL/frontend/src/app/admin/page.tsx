'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowLeft, Database, RefreshCw, Search, ShieldCheck, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { ClusterStatus, SearchStats, WriteConcernResult } from '@/types';

export default function AdminPage() {
  const [cluster, setCluster] = useState<ClusterStatus | null>(null);
  const [stats, setStats] = useState<SearchStats | null>(null);
  const [writeConcern, setWriteConcern] = useState<WriteConcernResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningWriteConcern, setRunningWriteConcern] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const [clusterResponse, statsResponse] = await Promise.all([
        api.get<ClusterStatus>('/cluster/status'),
        api.get<SearchStats>('/search/stats'),
      ]);
      setCluster(clusterResponse.data);
      setStats(statsResponse.data);
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || 'Failed to load cluster status');
    } finally {
      setLoading(false);
    }
  };

  const runWriteConcern = async () => {
    setRunningWriteConcern(true);
    setError(null);
    try {
      const response = await api.post<WriteConcernResult>('/admin/write-concern-test', { count: 100 });
      setWriteConcern(response.data);
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || 'Write concern test failed');
    } finally {
      setRunningWriteConcern(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      <header className="border-b border-dark-700 bg-dark-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-dark-300 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <button
            onClick={loadStatus}
            className="flex items-center gap-2 bg-dark-700 hover:bg-dark-600 px-4 py-2 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Mowndark Cluster Lab</h1>
          <p className="text-dark-400 mt-2">
            Read-only cluster visibility plus safe lab checks for search and write concern behavior.
          </p>
        </div>

        {error && <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-lg">{error}</div>}
        {loading ? (
          <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <section className="bg-dark-800 border border-dark-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Database className="w-5 h-5 text-accent-primary" />
                <h2 className="text-xl font-semibold">Cluster Status</h2>
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-dark-400">Healthy</dt>
                  <dd className={cluster?.healthy ? 'text-green-400' : 'text-red-400'}>{String(cluster?.healthy)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-dark-400">Database</dt>
                  <dd>{cluster?.database || 'unknown'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-dark-400">Shards</dt>
                  <dd>{cluster?.shardCount ?? 0}</dd>
                </div>
              </dl>
              <div className="mt-4 space-y-2">
                {cluster?.shards?.map((shard) => (
                  <div key={shard.id} className="bg-dark-700/60 rounded p-3 text-sm">
                    <div className="font-medium">{shard.id}</div>
                    <div className="text-dark-400 break-all">{shard.host}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-dark-800 border border-dark-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Search className="w-5 h-5 text-accent-primary" />
                <h2 className="text-xl font-semibold">Search Indexes</h2>
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-dark-400">Text search</dt>
                  <dd className="text-green-400">{String(stats?.text_search_available)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-dark-400">Vector search</dt>
                  <dd className={stats?.vector_search_available ? 'text-green-400' : 'text-yellow-400'}>
                    {String(stats?.vector_search_available)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-dark-400">Notes</dt>
                  <dd>{stats?.total_notes ?? 0}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-dark-400">Embedded notes</dt>
                  <dd>{stats?.notes_with_embedding ?? 0}</dd>
                </div>
              </dl>
            </section>

            <section className="bg-dark-800 border border-dark-700 rounded-xl p-6 md:col-span-2">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-accent-primary" />
                  <h2 className="text-xl font-semibold">Use case 8: write concern</h2>
                </div>
                <button
                  onClick={runWriteConcern}
                  disabled={runningWriteConcern}
                  className="bg-accent-primary hover:bg-accent-secondary disabled:opacity-60 px-4 py-2 rounded-lg"
                >
                  {runningWriteConcern ? 'Running...' : 'Run benchmark'}
                </button>
              </div>
              {writeConcern ? (
                <div className="grid sm:grid-cols-3 gap-4 text-sm">
                  <div className="bg-dark-700/60 rounded p-4">
                    <Activity className="w-4 h-4 text-yellow-400 mb-2" />
                    <div className="text-dark-400">Async w:0</div>
                    <div className="text-lg font-semibold">{writeConcern.asyncStyle.elapsedMs} ms</div>
                    <div className="text-dark-400">verified {writeConcern.asyncStyle.verifiedCount}</div>
                  </div>
                  <div className="bg-dark-700/60 rounded p-4">
                    <ShieldCheck className="w-4 h-4 text-green-400 mb-2" />
                    <div className="text-dark-400">Majority+journal</div>
                    <div className="text-lg font-semibold">{writeConcern.syncDurable.elapsedMs} ms</div>
                    <div className="text-dark-400">verified {writeConcern.syncDurable.verifiedCount}</div>
                  </div>
                  <div className="bg-dark-700/60 rounded p-4">
                    <div className="text-dark-400">Pass</div>
                    <div className={writeConcern.pass ? 'text-green-400 text-lg font-semibold' : 'text-red-400 text-lg font-semibold'}>
                      {String(writeConcern.pass)}
                    </div>
                    <div className="text-dark-400 break-all">{writeConcern.batchId}</div>
                  </div>
                </div>
              ) : (
                <p className="text-dark-400 text-sm">
                  Run this after the cluster is initialized to compare fire-and-forget and durable writes.
                </p>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
