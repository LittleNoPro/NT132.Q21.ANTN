'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Eye,
  FileText,
  LayoutDashboard,
  LogIn,
  LogOut,
  Plus,
  Search,
  Sparkles,
  Type,
  User,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { SearchResult } from '@/types';

interface SearchStats {
  total_notes: number;
  notes_with_embedding: number;
  public_notes: number;
  vector_search_available: boolean;
  text_search_available: boolean;
}

const SUGGESTIONS = [
  'writeup diceCTF 2025',
  'sql injection basics',
  'buffer overflow primer',
  'wireshark packet capture',
];

export default function SearchPage() {
  const router = useRouter();
  const { user, isAuthenticated, checkAuth, logout } = useAuthStore();

  const [keywordQuery, setKeywordQuery] = useState('sql injection basics');
  const [vectorQuery, setVectorQuery] = useState('sql injection basics');
  const [keywordResults, setKeywordResults] = useState<SearchResult[]>([]);
  const [vectorResults, setVectorResults] = useState<SearchResult[]>([]);
  const [stats, setStats] = useState<SearchStats | null>(null);
  const [keywordLoading, setKeywordLoading] = useState(false);
  const [vectorLoading, setVectorLoading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get('/search/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load search stats:', err);
    }
  };

  const runSearch = async (mode: 'text' | 'vector', query: string) => {
    if (!query.trim()) {
      if (mode === 'text') {
        setKeywordResults([]);
      } else {
        setVectorResults([]);
      }
      return;
    }

    const setLoading = mode === 'text' ? setKeywordLoading : setVectorLoading;
    const setResults = mode === 'text' ? setKeywordResults : setVectorResults;

    setLoading(true);
    if (mode === 'vector') {
      setError(null);
    }

    try {
      const response = await api.get('/search', {
        params: {
          q: query,
          mode,
          limit: 12,
        },
      });
      setResults(response.data.results || []);
    } catch (err: unknown) {
      console.error(`${mode} search failed:`, err);
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const message = axiosErr.response?.data?.error || `Failed to run ${mode} search`;
      if (mode === 'vector') {
        setError(message);
      }
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = (value: string) => {
    setKeywordQuery(value);
    setVectorQuery(value);
    void runSearch('text', value);
    void runSearch('vector', value);
  };

  const handleNewNote = async () => {
    try {
      const response = await api.post('/notes', {
        title: 'Untitled',
        content: '# New Note\n\nStart writing...',
      });
      router.push(`/note/${response.data.note.shortid}`);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleReindex = async () => {
    setReindexing(true);
    setError(null);
    try {
      await api.post('/search/reindex');
      await loadStats();
      await runSearch('vector', vectorQuery);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Failed to sync embeddings');
    } finally {
      setReindexing(false);
    }
  };

  const renderResults = (results: SearchResult[], mode: 'text' | 'vector') => {
    if (results.length === 0) {
      return (
        <div className="rounded-xl border border-dark-700 bg-dark-800 p-6 text-sm text-dark-400">
          No results yet.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {results.map((result) => (
          <Link
            key={`${mode}-${result.id}`}
            href={`/s/${result.shortid}`}
            className="block rounded-xl border border-dark-700 bg-dark-800 p-5 transition-all hover:border-accent-primary hover:shadow-lg"
          >
            <div className="mb-2 flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold text-white">{result.title}</h3>
              {mode === 'vector' && typeof result.score === 'number' && (
                <span className="text-xs font-medium text-accent-primary">
                  score {result.score.toFixed(4)}
                </span>
              )}
            </div>
            {result.description && (
              <p className="mb-4 line-clamp-3 text-sm text-dark-400">{result.description}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-dark-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(result.updated_at), { addSuffix: true })}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {result.view_count} views
              </span>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-dark-900">
      <header className="sticky top-0 z-50 border-b border-dark-700 bg-dark-800/50 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <FileText className="h-8 w-8 text-accent-primary" />
            <span className="text-xl font-bold text-white">Mowndark</span>
          </Link>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 text-dark-300 transition-colors hover:text-white"
                >
                  <LayoutDashboard className="hidden h-4 w-4 sm:block" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
                <button
                  onClick={handleNewNote}
                  className="flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 text-white transition-colors hover:bg-accent-secondary"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Note</span>
                </button>
                <div className="relative">
                  <button
                    onClick={() => setActiveMenu(activeMenu === 'user' ? null : 'user')}
                    className="flex items-center gap-2 text-dark-300 transition-colors hover:text-white"
                  >
                    <User className="h-5 w-5" />
                    <span className="hidden sm:inline">
                      {user?.display_name || user?.username || 'Profile'}
                    </span>
                  </button>
                  {activeMenu === 'user' && (
                    <div className="absolute right-0 mt-2 w-48 rounded-lg border border-dark-700 bg-dark-800 py-1 shadow-xl">
                      <Link
                        href={`/profile/${user?.username}`}
                        className="flex items-center gap-2 px-4 py-2 text-dark-300 hover:bg-dark-700 hover:text-white"
                      >
                        <User className="h-4 w-4" />
                        Public Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-4 py-2 text-dark-300 hover:bg-dark-700 hover:text-white"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 text-white transition-colors hover:bg-accent-secondary"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent-primary/30 bg-accent-primary/10 px-4 py-2 text-sm font-medium text-accent-primary">
            <Sparkles className="h-4 w-4" />
            Search
          </div>
          <h1 className="mb-3 text-4xl font-bold text-white">Keyword Search and Vector Search</h1>
          <p className="max-w-3xl text-dark-300">
            Search public notes by keyword or use semantic retrieval with Ollama embeddings
            to find related writeups and study notes.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => applySuggestion(suggestion)}
              className="rounded-lg border border-dark-700 bg-dark-800 px-4 py-2 text-sm text-dark-200 transition-colors hover:border-accent-primary hover:text-white"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {stats && (
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
              <p className="text-sm text-dark-400">Public notes</p>
              <p className="mt-1 text-2xl font-semibold text-white">{stats.public_notes}</p>
            </div>
            <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
              <p className="text-sm text-dark-400">Vector indexed</p>
              <p className="mt-1 text-2xl font-semibold text-white">{stats.notes_with_embedding}</p>
            </div>
            <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
              <p className="text-sm text-dark-400">Vector search</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {stats.vector_search_available ? 'Ready' : 'Unavailable'}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-dark-700 bg-dark-800/70">
            <div className="flex items-center gap-2 border-b border-dark-700 px-5 py-4 text-lg font-semibold text-white">
              <Search className="h-5 w-5 text-accent-primary" />
              Keyword Search
            </div>
            <div className="space-y-5 p-5">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={keywordQuery}
                  onChange={(event) => setKeywordQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void runSearch('text', keywordQuery);
                    }
                  }}
                  placeholder="Search public notes..."
                  className="flex-1 rounded-lg border border-dark-700 bg-dark-900 px-4 py-3 text-white outline-none transition-colors placeholder:text-dark-500 focus:border-accent-primary"
                />
                <button
                  onClick={() => void runSearch('text', keywordQuery)}
                  className="rounded-lg bg-accent-primary px-5 py-3 font-medium text-white transition-colors hover:bg-accent-secondary"
                >
                  {keywordLoading ? '...' : 'Search'}
                </button>
              </div>
              {renderResults(keywordResults, 'text')}
            </div>
          </section>

          <section className="rounded-2xl border border-dark-700 bg-dark-800/70">
            <div className="flex items-center gap-2 border-b border-dark-700 px-5 py-4 text-lg font-semibold text-white">
              <Sparkles className="h-5 w-5 text-accent-primary" />
              Vector Search
            </div>
            <div className="space-y-5 p-5">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={vectorQuery}
                  onChange={(event) => setVectorQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void runSearch('vector', vectorQuery);
                    }
                  }}
                  placeholder="Describe what you want to find..."
                  className="flex-1 rounded-lg border border-dark-700 bg-dark-900 px-4 py-3 text-white outline-none transition-colors placeholder:text-dark-500 focus:border-accent-primary"
                />
                <button
                  onClick={() => void runSearch('vector', vectorQuery)}
                  className="rounded-lg bg-accent-primary px-5 py-3 font-medium text-white transition-colors hover:bg-accent-secondary"
                >
                  {vectorLoading ? '...' : 'Search'}
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-dark-400">
                  {stats
                    ? `${stats.notes_with_embedding} notes currently indexed for semantic search`
                    : 'Vector index status unavailable'}
                </span>
                <button
                  onClick={handleReindex}
                  disabled={reindexing}
                  className="inline-flex items-center gap-2 text-accent-primary transition-colors hover:text-white disabled:opacity-60"
                >
                  <Type className="h-4 w-4" />
                  {reindexing ? 'Syncing embeddings...' : 'Sync embeddings first'}
                </button>
              </div>
              {renderResults(vectorResults, 'vector')}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
