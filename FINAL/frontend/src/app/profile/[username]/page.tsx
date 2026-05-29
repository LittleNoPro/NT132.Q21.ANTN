'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  User,
  Mail,
  Calendar,
  ArrowLeft,
  Eye,
  Lock,
  Users,
  Globe,
  Clock,
  Edit,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Note } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  email?: string;
  avatar_url?: string;
  created_at: string;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [params.username]);

  const loadProfile = async () => {
    try {
      const response = await api.get(`/users/${params.username}`);
      setProfile(response.data.user);
      setNotes(response.data.notes || []);
    } catch (error: any) {
      console.error('Failed to load profile:', error);
      if (error.response?.status === 404) {
        // User not found
      }
    } finally {
      setLoading(false);
    }
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'private':
        return <Lock className="w-4 h-4 text-red-400" />;
      case 'protected':
        return <Eye className="w-4 h-4 text-blue-400" />;
      case 'editable':
        return <Users className="w-4 h-4 text-yellow-400" />;
      case 'freely':
        return <Globe className="w-4 h-4 text-green-400" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPermissionLabel = (permission: string) => {
    switch (permission) {
      case 'private':
        return 'Private';
      case 'protected':
        return 'Public Read';
      case 'editable':
        return 'Editable';
      case 'freely':
        return 'Freely';
      default:
        return permission;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-dark-300">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center p-8 bg-dark-800 rounded-2xl border border-dark-700 max-w-md">
          <div className="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-dark-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">User not found</h1>
          <p className="text-dark-400 mb-6">
            The user you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-accent-primary hover:bg-accent-secondary text-white px-5 py-2.5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back home
          </Link>
        </div>
      </div>
    );
  }

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

            <Link
              href="/"
              className="flex items-center gap-2 text-dark-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Profile Header */}
        <div className="bg-dark-800 rounded-2xl border border-dark-700 p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="w-24 h-24 rounded-full border-2 border-accent-primary"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                  <span className="text-white text-3xl font-bold">
                    {profile.display_name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">
                {profile.display_name}
              </h1>
              <p className="text-dark-400 mb-4">@{profile.username}</p>

              <div className="flex flex-wrap gap-4 text-sm text-dark-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>{notes.length} public notes</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Public Notes */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Public Notes</h2>

          {notes.length === 0 ? (
            <div className="text-center py-16 bg-dark-800 rounded-2xl border border-dark-700">
              <FileText className="w-16 h-16 text-dark-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                No public notes yet
              </h3>
              <p className="text-dark-400">
                This user hasn&apos;t published any notes yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {notes.map((note) => (
                <Link
                  key={note.id}
                  href={`/s/${note.shortid}`}
                  className="bg-dark-800 rounded-xl border border-dark-700 hover:border-accent-primary transition-all p-6 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getPermissionIcon(note.permission)}
                        <h3 className="text-lg font-semibold text-white group-hover:text-accent-primary transition-colors truncate">
                          {note.title}
                        </h3>
                        <span className="text-xs text-dark-500 px-2 py-1 bg-dark-700 rounded">
                          {getPermissionLabel(note.permission)}
                        </span>
                      </div>
                      {note.description && (
                        <p className="text-dark-400 text-sm line-clamp-2 mb-3">
                          {note.description}
                        </p>
                      )}
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
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
