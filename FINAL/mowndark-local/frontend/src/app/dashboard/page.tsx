'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  Lock,
  Unlock,
  LogOut,
  User,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { Note } from '@/types';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const router = useRouter();
  const { user, checkAuth, logout } = useAuthStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const authenticated = await checkAuth();
      if (!authenticated) {
        router.push('/login');
        return;
      }
      loadNotes();
    };
    init();
  }, []);

  const loadNotes = async () => {
    try {
      const response = await api.get('/notes');
      setNotes(response.data.notes || []);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
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

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await api.delete(`/notes/${noteId}`);
      setNotes(notes.filter((n) => n.shortid !== noteId));
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
    setActiveMenu(null);
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'private':
        return <Lock className="w-4 h-4 text-red-400" />;
      case 'protected':
      case 'locked':
        return <Lock className="w-4 h-4 text-yellow-400" />;
      default:
        return <Unlock className="w-4 h-4 text-green-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <header className="border-b border-dark-700 bg-dark-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <FileText className="w-8 h-8 text-accent-primary" />
              <span className="text-xl font-bold text-white">Mowndark</span>
            </Link>

            <div className="flex items-center gap-4">
              <button
                onClick={handleNewNote}
                className="flex items-center gap-2 bg-accent-primary hover:bg-accent-secondary text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Note
              </button>

              <Link
                href="/search"
                className="hidden sm:inline-flex items-center gap-2 rounded-full border border-accent-primary/30 bg-accent-primary/10 px-4 py-2 text-sm font-medium text-accent-primary transition-colors hover:border-accent-primary hover:text-white"
              >
                <Search className="w-4 h-4" />
                Search
              </Link>

              <div className="relative">
                <button
                  onClick={() => setActiveMenu(activeMenu === 'user' ? null : 'user')}
                  className="flex items-center gap-2 text-dark-300 hover:text-white transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span className="hidden sm:inline">
                    {user?.display_name || user?.username || 'Profile'}
                  </span>
                </button>

                {activeMenu === 'user' && (
                  <div className="absolute right-0 mt-2 w-48 bg-dark-800 border border-dark-700 rounded-lg shadow-xl py-1">
                    <Link
                      href={`/profile/${user?.username}`}
                      className="flex items-center gap-2 px-4 py-2 text-dark-300 hover:text-white hover:bg-dark-700"
                    >
                      <User className="w-4 h-4" />
                      Public Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 text-dark-300 hover:text-white hover:bg-dark-700 w-full"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-2xl font-bold text-white">My Notes</h1>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
            />
          </div>
        </div>

        {filteredNotes.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-dark-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              {searchQuery ? 'No notes found' : 'No notes yet'}
            </h2>
            <p className="text-dark-400 mb-6">
              {searchQuery
                ? 'Try a different search term'
                : 'Create your first note to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleNewNote}
                className="inline-flex items-center gap-2 bg-accent-primary hover:bg-accent-secondary text-white px-6 py-3 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Note
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className="bg-dark-800 rounded-xl border border-dark-700 hover:border-dark-600 transition-colors"
              >
                <Link href={`/note/${note.shortid}`} className="block p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getPermissionIcon(note.permission)}
                        <h3 className="text-lg font-semibold text-white truncate">
                          {note.title}
                        </h3>
                      </div>
                      <p className="text-dark-400 text-sm line-clamp-2 mb-3">
                        {note.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-dark-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(note.updated_at), {
                            addSuffix: true,
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {note.view_count} views
                        </span>
                      </div>
                    </div>

                    <div className="relative ml-4">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveMenu(activeMenu === note.id ? null : note.id);
                        }}
                        className="p-2 text-dark-500 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>

                      {activeMenu === note.id && (
                        <div className="absolute right-0 mt-1 w-36 bg-dark-700 border border-dark-600 rounded-lg shadow-xl py-1 z-10">
                          <Link
                            href={`/note/${note.shortid}`}
                            className="flex items-center gap-2 px-4 py-2 text-dark-300 hover:text-white hover:bg-dark-600"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </Link>
                          <Link
                            href={`/s/${note.shortid}`}
                            className="flex items-center gap-2 px-4 py-2 text-dark-300 hover:text-white hover:bg-dark-600"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Link>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleDeleteNote(note.shortid);
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-dark-600 w-full"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
