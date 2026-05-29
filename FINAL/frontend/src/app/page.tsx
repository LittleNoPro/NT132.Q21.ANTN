'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Plus, 
  LogIn, 
  User, 
  Zap, 
  Share2, 
  Lock,
  ChevronRight,
  Eye
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { Note } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  const handleNewNote = async () => {
    try {
      const response = await api.post('/notes', {
        title: 'Untitled',
        content: '# New Note\n\nStart writing...'
      });
      router.push(`/note/${response.data.note.shortid}`);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const features = [
    {
      icon: <Zap className="w-8 h-8 text-yellow-400" />,
      title: 'Real-time Collaboration',
      description: 'Share your notes with a URL and collaborate instantly.',
    },
    {
      icon: <FileText className="w-8 h-8 text-blue-400" />,
      title: 'Full Markdown Support',
      description: 'Write with GitHub-flavored markdown, code highlighting, and more.',
    },
    {
      icon: <Lock className="w-8 h-8 text-green-400" />,
      title: 'Privacy Controls',
      description: 'Choose who can view and edit your notes with flexible permissions.',
    },
  ];

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="border-b border-dark-700 bg-dark-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <FileText className="w-8 h-8 text-accent-primary" />
              <span className="text-xl font-bold text-white">Mowndark</span>
            </Link>

            <nav className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <Link 
                    href="/dashboard"
                    className="text-dark-300 hover:text-white transition-colors"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleNewNote}
                    className="flex items-center gap-2 bg-accent-primary hover:bg-accent-secondary text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New Note
                  </button>
                  <Link 
                    href={`/profile/${user?.username}`}
                    className="flex items-center gap-2 text-dark-300 hover:text-white transition-colors"
                  >
                    <User className="w-5 h-5" />
                    {user?.display_name || user?.username || 'Profile'}
                  </Link>
                </>
              ) : (
                <>
                  <button
                    onClick={handleNewNote}
                    className="text-dark-300 hover:text-white transition-colors"
                  >
                    Try it out
                  </button>
                  <Link
                    href="/login"
                    className="flex items-center gap-2 bg-accent-primary hover:bg-accent-secondary text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Write and Share with
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary to-accent-secondary">
              {' '}Markdown
            </span>
          </h1>
          <p className="text-xl text-dark-300 mb-8 max-w-2xl mx-auto">
            The best way to write and share your knowledge. Create beautiful documents,
            collaborate in real-time, and publish with a single click.
          </p>
          <div className="flex justify-center">
            <button
              onClick={handleNewNote}
              className="flex items-center justify-center gap-2 bg-accent-primary hover:bg-accent-secondary text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              Start Writing
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-dark-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Everything you need to write better
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-dark-800 rounded-xl p-6 border border-dark-700 hover:border-accent-primary transition-colors"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-dark-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-dark-700">
        <div className="max-w-6xl mx-auto text-center text-dark-500">
          <p>© {new Date().getFullYear()} Mowndark. Made by Yuki Shiroi</p>
        </div>
      </footer>
    </div>
  );
}
