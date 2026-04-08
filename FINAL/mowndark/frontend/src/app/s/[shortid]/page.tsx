'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { FileText, ArrowLeft, Edit, Clock, Eye, Loader2, Share2, Check } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { Note } from '@/types';
import { formatDistanceToNow } from 'date-fns';

const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false });

export default function PublishedNotePage() {
  const params = useParams();
  const router = useRouter();
  const { user, checkAuth } = useAuthStore();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [remarkGfm, setRemarkGfm] = useState<any>(null);
  const [rehypeHighlight, setRehypeHighlight] = useState<any>(null);
  const [rehypeRaw, setRehypeRaw] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      import('remark-gfm'),
      import('rehype-highlight'),
      import('rehype-raw'),
    ]).then(([rgfm, rhl, rraw]) => {
      setRemarkGfm(() => rgfm.default);
      setRehypeHighlight(() => rhl.default);
      setRehypeRaw(() => rraw.default);
    });
  }, []);

  useEffect(() => {
    checkAuth();
    loadNote();
  }, [params.shortid]);

  const loadNote = async () => {
    try {
      const response = await api.get(`/notes/s/${params.shortid}`);
      const noteData = response.data.note;
      setNote(noteData);

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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          <span className="text-[#787c99]">Loading...</span>
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
          <p className="text-[#787c99] mb-6">This note doesn&apos;t exist or has been deleted.</p>
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
    <div className="min-h-screen bg-[#0f0f14]">
      <header className="border-b border-[#2a2b3d] bg-[#16161e]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-[#787c99] hover:text-[#c0caf5] transition-colors group"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              </Link>

              <div className="h-5 w-px bg-[#2a2b3d]" />

              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-[#c0caf5]">Mowndark</span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
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

              {canEdit && (
                <Link
                  href={`/note/${note.shortid}`}
                  className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white px-4 py-2 rounded-lg transition-all shadow-lg shadow-violet-500/25"
                >
                  <Edit className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm font-medium">Edit</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-[#c0caf5] mb-6 leading-tight">
            {note.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-[#787c99]">
            <span className="flex items-center gap-2 bg-[#1f1f28] px-3 py-1.5 rounded-full">
              <Clock className="w-4 h-4 text-violet-400" />
              Updated {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
            </span>
            <span className="flex items-center gap-2 bg-[#1f1f28] px-3 py-1.5 rounded-full">
              <Eye className="w-4 h-4 text-violet-400" />
              {note.view_count} views
            </span>
          </div>
        </div>

        <article className="prose prose-invert prose-lg max-w-none">
          {remarkGfm && rehypeHighlight && rehypeRaw && (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight, rehypeRaw]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-4xl font-bold text-[#c0caf5] mb-6 pb-3 border-b border-[#2a2b3d]">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-3xl font-semibold text-[#c0caf5] mt-10 mb-4 pb-2 border-b border-[#2a2b3d]">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-2xl font-semibold text-[#c0caf5] mt-8 mb-3">
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-xl font-medium text-[#c0caf5] mt-6 mb-2">
                    {children}
                  </h4>
                ),
                p: ({ children }) => (
                  <p className="text-[#a9b1d6] leading-relaxed mb-4 text-lg">{children}</p>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#7c3aed] hover:text-[#a78bfa] underline decoration-[#7c3aed]/30 hover:decoration-[#a78bfa] transition-colors"
                  >
                    {children}
                  </a>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-outside ml-6 text-[#a9b1d6] mb-4 space-y-2">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-outside ml-6 text-[#a9b1d6] mb-4 space-y-2">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="text-[#a9b1d6] text-lg">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-[#7c3aed] bg-[#1a1b26] pl-6 py-4 my-6 rounded-r-xl italic text-[#9aa5ce]">
                    {children}
                  </blockquote>
                ),
                code: ({ className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match;

                  if (isInline) {
                    return (
                      <code className="bg-[#1a1b26] text-[#f7768e] px-2 py-1 rounded text-[0.9em] font-mono">
                        {children}
                      </code>
                    );
                  }

                  return (
                    <code className={`${className} block`} {...props}>
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="bg-[#1a1b26] border border-[#2a2b3d] rounded-xl p-5 overflow-x-auto my-6 text-sm leading-relaxed">
                    {children}
                  </pre>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-6">
                    <table className="min-w-full border-collapse border border-[#2a2b3d] rounded-xl overflow-hidden">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="bg-[#1a1b26] border border-[#2a2b3d] px-4 py-3 text-left text-[#c0caf5] font-semibold">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-[#2a2b3d] px-4 py-3 text-[#a9b1d6]">
                    {children}
                  </td>
                ),
                hr: () => <hr className="border-[#2a2b3d] my-10" />,
                img: ({ src, alt }) => (
                  <img
                    src={src}
                    alt={alt}
                    className="max-w-full h-auto rounded-xl shadow-2xl shadow-black/50 my-6"
                  />
                ),
                input: ({ type, checked }) => {
                  if (type === 'checkbox') {
                    return (
                      <input
                        type="checkbox"
                        checked={checked}
                        readOnly
                        className="mr-2 accent-[#7c3aed] rounded"
                      />
                    );
                  }
                  return null;
                },
              }}
            >
              {note.content || ''}
            </ReactMarkdown>
          )}
        </article>
      </main>

      <footer className="border-t border-[#2a2b3d] py-8 mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-[#787c99] hover:text-[#c0caf5] transition-colors">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <FileText className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm">Powered by <span className="font-semibold">Mowndark</span></span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
