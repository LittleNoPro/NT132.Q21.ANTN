'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  FileText,
  Save,
  Share2,
  Settings,
  ArrowLeft,
  Check,
  Loader2,
  ImagePlus,
  Globe,
  Lock,
  Users,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { Note } from '@/types';
import { formatDistanceToNow } from 'date-fns';

const MarkdownEditor = dynamic(
  () => import('@/components/Editor/MarkdownEditor'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full bg-[#0f0f14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          <span className="text-[#787c99] text-sm">Loading editor...</span>
        </div>
      </div>
    )
  }
);

export default function NotePage() {
  const params = useParams();
  const router = useRouter();
  const { user, checkAuth } = useAuthStore();
  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [permission, setPermission] = useState('private');
  const [canEdit, setCanEdit] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const permissionOptions = [
    { value: 'private', label: 'Private', description: 'Only you can view & edit', icon: Lock },
    { value: 'protected', label: 'Public Read', description: 'Anyone can read, only you edit', icon: Shield },
    { value: 'editable', label: 'Editable', description: 'Signed-in users can edit', icon: Users },
    { value: 'freely', label: 'Freely', description: 'Anyone can edit', icon: Globe },
  ];

  useEffect(() => {
    checkAuth();
    loadNote();
  }, [params.id]);

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!canEdit) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await uploadImage(file);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [canEdit, content]);

  const uploadImage = async (file: File) => {
    if (!note) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('note_id', note.shortid);

      const response = await api.post('/images/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const imageUrl = response.data.url;
      const imageMarkdown = `![image](${imageUrl})`;

      setContent((prev) => prev + '\n' + imageMarkdown + '\n');
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await uploadImage(file);
      }
    };
    input.click();
  };

  const loadNote = async () => {
    try {
      const response = await api.get(`/notes/${params.id}`);
      const noteData = response.data.note;
      setNote(noteData);
      setContent(noteData.content || '');
      setTitle(noteData.title || 'Untitled');
      setPermission(noteData.permission || 'private');

      const isOwner = user?.id === noteData.owner_id;
      const canEditNote =
        noteData.permission === 'freely' ||
        (noteData.permission === 'editable' && Boolean(user)) ||
        isOwner;
      setCanEdit(canEditNote);
    } catch (error: any) {
      console.error('Failed to load note:', error);
      if (error.response?.status === 404) {
        router.push('/404');
      } else if (error.response?.status === 403) {
        router.push('/403');
      }
    } finally {
      setLoading(false);
    }
  };

  const saveNote = useCallback(async () => {
    if (!note || !canEdit) return;

    setSaving(true);
    try {
      await api.put(`/notes/${note.shortid}`, {
        content,
        title,
        permission,
      });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setSaving(false);
    }
  }, [note, content, title, permission, canEdit]);

  useEffect(() => {
    if (!canEdit || !note) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveNote();
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, title]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/s/${note?.shortid}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContentChange = (value: string) => {
    setContent(value);

    const lines = value.split('\n');
    for (const line of lines) {
      if (line.startsWith('# ')) {
        setTitle(line.slice(2).trim());
        break;
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-[#787c99]">Loading note...</span>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen bg-[#0f0f14] flex items-center justify-center">
        <div className="text-center p-8 bg-[#16161e] rounded-2xl border border-[#2a2b3d] max-w-md">
          <div className="w-16 h-16 bg-[#1f1f28] rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-[#787c99]" />
          </div>
          <h1 className="text-2xl font-bold text-[#c0caf5] mb-2">Note not found</h1>
          <p className="text-[#787c99] mb-6">The note you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen bg-[#0f0f14] flex flex-col overflow-hidden">
      <header className="border-b border-[#2a2b3d] bg-[#16161e]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="px-4 sm:px-6">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center gap-3">
              <Link
                href={user ? '/dashboard' : '/'}
                className="flex items-center gap-2 text-[#787c99] hover:text-[#c0caf5] transition-colors group"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              </Link>

              <div className="h-5 w-px bg-[#2a2b3d]" />

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!canEdit}
                  className="bg-transparent text-[#c0caf5] font-medium focus:outline-none max-w-[150px] sm:max-w-[300px] truncate placeholder:text-[#565869]"
                  placeholder="Untitled"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-3 mr-2">
                {uploading && (
                  <div className="flex items-center gap-2 text-sm text-[#787c99] bg-[#1f1f28] px-3 py-1.5 rounded-full">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
                    <span>Uploading...</span>
                  </div>
                )}

                {canEdit && !uploading && (
                  <div className="flex items-center gap-2 text-sm text-[#787c99]">
                    {saving ? (
                      <div className="flex items-center gap-2 bg-[#1f1f28] px-3 py-1.5 rounded-full">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        <span>Saving...</span>
                      </div>
                    ) : lastSaved ? (
                      <div className="flex items-center gap-2 bg-[#1f1f28] px-3 py-1.5 rounded-full">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Saved {formatDistanceToNow(lastSaved, { addSuffix: true })}</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {canEdit && (
                <button
                  onClick={handleImageUpload}
                  disabled={uploading}
                  className="flex items-center justify-center w-9 h-9 text-[#787c99] hover:text-[#c0caf5] hover:bg-[#1f1f28] rounded-lg transition-all disabled:opacity-50"
                  title="Upload image (or paste from clipboard)"
                >
                  <ImagePlus className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  copied
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-[#787c99] hover:text-[#c0caf5] hover:bg-[#1f1f28]'
                }`}
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                <span className="hidden sm:inline text-sm">{copied ? 'Copied!' : 'Share'}</span>
              </button>

              <Link
                href={`/s/${note.shortid}`}
                target="_blank"
                className="flex items-center justify-center w-9 h-9 text-[#787c99] hover:text-[#c0caf5] hover:bg-[#1f1f28] rounded-lg transition-all"
                title="Open published view"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>

              {canEdit && (
                <div className="relative">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
                      showSettings
                        ? 'bg-violet-500/20 text-violet-400'
                        : 'text-[#787c99] hover:text-[#c0caf5] hover:bg-[#1f1f28]'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                  </button>

                  {showSettings && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowSettings(false)}
                      />
                      <div className="absolute right-0 mt-2 w-72 bg-[#16161e] border border-[#2a2b3d] rounded-xl shadow-2xl shadow-black/50 p-4 z-20">
                        <h3 className="text-sm font-semibold text-[#c0caf5] mb-4 flex items-center gap-2">
                          <Settings className="w-4 h-4 text-violet-400" />
                          Note Settings
                        </h3>

                        <div className="space-y-2">
                          <label className="block text-xs text-[#787c99] mb-2 uppercase tracking-wide">
                            Visibility
                          </label>
                          {permissionOptions.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setPermission(option.value)}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                                permission === option.value
                                  ? 'bg-violet-500/20 border border-violet-500/50'
                                  : 'hover:bg-[#1f1f28] border border-transparent'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                permission === option.value
                                  ? 'bg-violet-500/30 text-violet-400'
                                  : 'bg-[#1f1f28] text-[#787c99]'
                              }`}>
                                <option.icon className="w-4 h-4" />
                              </div>
                              <div className="text-left">
                                <div className={`text-sm font-medium ${
                                  permission === option.value ? 'text-violet-300' : 'text-[#c0caf5]'
                                }`}>
                                  {option.label}
                                </div>
                                <div className="text-xs text-[#787c99]">
                                  {option.description}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>

                        <div className="mt-4 pt-4 border-t border-[#2a2b3d]">
                          <button
                            onClick={() => {
                              saveNote();
                              setShowSettings(false);
                            }}
                            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white py-2.5 rounded-lg text-sm font-medium transition-all shadow-lg shadow-violet-500/25"
                          >
                            Save Settings
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {canEdit && (
                <button
                  onClick={saveNote}
                  disabled={saving}
                  className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white px-4 py-2 rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-violet-500/25"
                >
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm font-medium">Save</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <MarkdownEditor
          value={content}
          onChange={handleContentChange}
          onImageUpload={handleImageUpload}
          readOnly={!canEdit}
        />
      </main>
    </div>
  );
}
