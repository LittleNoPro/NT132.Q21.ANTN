'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Components } from 'react-markdown';
import dynamic from 'next/dynamic';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link2,
  List,
  ListOrdered,
  Quote,
  ImageIcon,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  Table,
  CheckSquare,
  Eye,
  Columns2,
  PanelLeft,
  Maximize2,
  Minimize2,
  Link as LinkIcon,
  Unlink,
} from 'lucide-react';

const CodeMirror = dynamic(
  () => import('@uiw/react-codemirror').then((mod) => mod.default),
  { ssr: false }
);

const loadExtensions = async () => {
  const [
    { markdown, markdownLanguage },
    { languages },
    { EditorView },
  ] = await Promise.all([
    import('@codemirror/lang-markdown'),
    import('@codemirror/language-data'),
    import('@codemirror/view'),
  ]);

  return [
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    EditorView.lineWrapping,
    EditorView.theme({
      '&': {
        height: '100%',
        fontSize: '15px',
      },
      '.cm-content': {
        fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Menlo, monospace',
        padding: '20px 24px',
        caretColor: '#a78bfa',
      },
      '.cm-line': {
        padding: '2px 0',
      },
      '.cm-cursor': {
        borderLeftColor: '#a78bfa',
        borderLeftWidth: '2px',
      },
      '.cm-activeLine': {
        backgroundColor: 'rgba(139, 92, 246, 0.08)',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'rgba(139, 92, 246, 0.08)',
      },
      '.cm-selectionBackground': {
        backgroundColor: 'rgba(139, 92, 246, 0.3) !important',
      },
      '&.cm-focused .cm-selectionBackground': {
        backgroundColor: 'rgba(139, 92, 246, 0.3) !important',
      },
      '.cm-gutters': {
        backgroundColor: '#1a1b26',
        borderRight: '1px solid #2a2b3d',
        color: '#565869',
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 12px 0 20px',
        minWidth: '40px',
      },
      '.cm-foldGutter': {
        width: '16px',
      },
      '.cm-scroller': {
        overflow: 'auto',
      },
    }),
  ];
};

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onImageUpload?: () => void;
  readOnly?: boolean;
}

interface ToolbarButton {
  icon: React.ReactNode;
  title: string;
  action: () => void;
  divider?: boolean;
}

export default function MarkdownEditor({
  value,
  onChange,
  onImageUpload,
  readOnly = false,
}: MarkdownEditorProps) {
  const [extensions, setExtensions] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'edit' | 'split' | 'preview'>('split');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [syncScroll, setSyncScroll] = useState(true);
  const editorRef = useRef<any>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadExtensions().then(setExtensions);
  }, []);

  useEffect(() => {
    if (!syncScroll || viewMode !== 'split') return;

    const timer = setTimeout(() => {
      const editorScrollContainer = editorRef.current?.view?.scrollDOM;
      const previewScrollContainer = previewRef.current;

      if (!editorScrollContainer || !previewScrollContainer) {
        return;
      }

      let isEditorScrolling = false;
      let isPreviewScrolling = false;
      let editorScrollTimeout: NodeJS.Timeout;
      let previewScrollTimeout: NodeJS.Timeout;

      const syncEditorToPreview = () => {
        if (isPreviewScrolling) return;

        clearTimeout(editorScrollTimeout);
        isEditorScrolling = true;

        const editorHeight = editorScrollContainer.scrollHeight - editorScrollContainer.clientHeight;
        const previewHeight = previewScrollContainer.scrollHeight - previewScrollContainer.clientHeight;

        if (editorHeight > 0 && previewHeight > 0) {
          const editorScrollPercentage = editorScrollContainer.scrollTop / editorHeight;
          const previewScrollTop = editorScrollPercentage * previewHeight;

          previewScrollContainer.scrollTop = previewScrollTop;
        }

        editorScrollTimeout = setTimeout(() => {
          isEditorScrolling = false;
        }, 150);
      };

      const syncPreviewToEditor = () => {
        if (isEditorScrolling) return;

        clearTimeout(previewScrollTimeout);
        isPreviewScrolling = true;

        const editorHeight = editorScrollContainer.scrollHeight - editorScrollContainer.clientHeight;
        const previewHeight = previewScrollContainer.scrollHeight - previewScrollContainer.clientHeight;

        if (editorHeight > 0 && previewHeight > 0) {
          const previewScrollPercentage = previewScrollContainer.scrollTop / previewHeight;
          const editorScrollTop = previewScrollPercentage * editorHeight;

          editorScrollContainer.scrollTop = editorScrollTop;
        }

        previewScrollTimeout = setTimeout(() => {
          isPreviewScrolling = false;
        }, 150);
      };

      editorScrollContainer.addEventListener('scroll', syncEditorToPreview);
      previewScrollContainer.addEventListener('scroll', syncPreviewToEditor);

      return () => {
        clearTimeout(editorScrollTimeout);
        clearTimeout(previewScrollTimeout);
        editorScrollContainer.removeEventListener('scroll', syncEditorToPreview);
        previewScrollContainer.removeEventListener('scroll', syncPreviewToEditor);
      };
    }, 100);

    return () => clearTimeout(timer);
  }, [syncScroll, viewMode, extensions]);

  const insertText = useCallback(
    (before: string, after: string = '', placeholder: string = '') => {
      if (!editorRef.current?.view) return;

      const view = editorRef.current.view;
      const { from, to } = view.state.selection.main;
      const selectedText = view.state.sliceDoc(from, to);
      const text = selectedText || placeholder;

      const insert = before + text + after;

      view.dispatch({
        changes: { from, to, insert },
        selection: {
          anchor: from + before.length,
          head: from + before.length + text.length,
        },
      });
      view.focus();
    },
    []
  );

  const insertAtLineStart = useCallback(
    (prefix: string) => {
      if (!editorRef.current?.view) return;

      const view = editorRef.current.view;
      const { from } = view.state.selection.main;
      const line = view.state.doc.lineAt(from);

      view.dispatch({
        changes: { from: line.from, to: line.from, insert: prefix },
      });
      view.focus();
    },
    []
  );

  const toolbarButtons: ToolbarButton[] = [
    {
      icon: <Heading1 className="w-4 h-4" />,
      title: 'Heading 1',
      action: () => insertAtLineStart('# '),
    },
    {
      icon: <Heading2 className="w-4 h-4" />,
      title: 'Heading 2',
      action: () => insertAtLineStart('## '),
    },
    {
      icon: <Heading3 className="w-4 h-4" />,
      title: 'Heading 3',
      action: () => insertAtLineStart('### '),
      divider: true,
    },
    {
      icon: <Bold className="w-4 h-4" />,
      title: 'Bold (Ctrl+B)',
      action: () => insertText('**', '**', 'bold text'),
    },
    {
      icon: <Italic className="w-4 h-4" />,
      title: 'Italic (Ctrl+I)',
      action: () => insertText('*', '*', 'italic text'),
    },
    {
      icon: <Strikethrough className="w-4 h-4" />,
      title: 'Strikethrough',
      action: () => insertText('~~', '~~', 'strikethrough'),
    },
    {
      icon: <Code className="w-4 h-4" />,
      title: 'Inline Code',
      action: () => insertText('`', '`', 'code'),
      divider: true,
    },
    {
      icon: <Link2 className="w-4 h-4" />,
      title: 'Link',
      action: () => insertText('[', '](url)', 'link text'),
    },
    {
      icon: <ImageIcon className="w-4 h-4" />,
      title: 'Image',
      action: () => onImageUpload?.() || insertText('![', '](url)', 'alt text'),
      divider: true,
    },
    {
      icon: <List className="w-4 h-4" />,
      title: 'Bullet List',
      action: () => insertAtLineStart('- '),
    },
    {
      icon: <ListOrdered className="w-4 h-4" />,
      title: 'Numbered List',
      action: () => insertAtLineStart('1. '),
    },
    {
      icon: <CheckSquare className="w-4 h-4" />,
      title: 'Task List',
      action: () => insertAtLineStart('- [ ] '),
    },
    {
      icon: <Quote className="w-4 h-4" />,
      title: 'Blockquote',
      action: () => insertAtLineStart('> '),
      divider: true,
    },
    {
      icon: <Minus className="w-4 h-4" />,
      title: 'Horizontal Rule',
      action: () => insertText('\n---\n'),
    },
    {
      icon: <Table className="w-4 h-4" />,
      title: 'Table',
      action: () =>
        insertText(
          '\n| Column 1 | Column 2 | Column 3 |\n| -------- | -------- | -------- |\n| Cell 1   | Cell 2   | Cell 3   |\n'
        ),
    },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !readOnly) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            insertText('**', '**', 'bold text');
            break;
          case 'i':
            e.preventDefault();
            insertText('*', '*', 'italic text');
            break;
          case 'k':
            e.preventDefault();
            insertText('[', '](url)', 'link text');
            break;
        }
      }
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
      if (e.key === 'F11') {
        e.preventDefault();
        setIsFullscreen(!isFullscreen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [insertText, readOnly, isFullscreen]);

  const theme = {
    '&': {
      backgroundColor: '#0f0f14',
    },
    '.cm-gutters': {
      backgroundColor: '#0f0f14',
    },
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-[#0f0f14] ${
        isFullscreen ? 'fixed inset-0 z-50' : 'h-full'
      }`}
    >
      {!readOnly && (
        <div className="flex items-center justify-between px-3 py-2 bg-[#16161e] border-b border-[#2a2b3d]">
          <div className="flex items-center gap-0.5 flex-wrap">
            {toolbarButtons.map((button, index) => (
              <div key={index} className="flex items-center">
                <button
                  onClick={button.action}
                  title={button.title}
                  className="p-2 text-[#787c99] hover:text-[#c0caf5] hover:bg-[#1f1f28] rounded-md transition-all duration-150 active:scale-95"
                >
                  {button.icon}
                </button>
                {button.divider && (
                  <div className="w-px h-5 bg-[#2a2b3d] mx-1.5" />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <div className="flex items-center bg-[#1f1f28] rounded-lg p-1">
              <button
                onClick={() => setViewMode('edit')}
                title="Editor only"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                  viewMode === 'edit'
                    ? 'bg-[#7c3aed] text-white shadow-lg shadow-violet-500/25'
                    : 'text-[#787c99] hover:text-[#c0caf5]'
                }`}
              >
                <PanelLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                onClick={() => setViewMode('split')}
                title="Split view"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                  viewMode === 'split'
                    ? 'bg-[#7c3aed] text-white shadow-lg shadow-violet-500/25'
                    : 'text-[#787c99] hover:text-[#c0caf5]'
                }`}
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Split</span>
              </button>
              <button
                onClick={() => setViewMode('preview')}
                title="Preview only"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                  viewMode === 'preview'
                    ? 'bg-[#7c3aed] text-white shadow-lg shadow-violet-500/25'
                    : 'text-[#787c99] hover:text-[#c0caf5]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Preview</span>
              </button>
            </div>

            {viewMode === 'split' && (
              <button
                onClick={() => setSyncScroll(!syncScroll)}
                title={syncScroll ? 'Disable scroll sync' : 'Enable scroll sync'}
                className={`p-2 rounded-md transition-all duration-150 ${
                  syncScroll
                    ? 'text-violet-400 bg-violet-500/20'
                    : 'text-[#787c99] hover:text-[#c0caf5] hover:bg-[#1f1f28]'
                }`}
              >
                {syncScroll ? (
                  <LinkIcon className="w-4 h-4" />
                ) : (
                  <Unlink className="w-4 h-4" />
                )}
              </button>
            )}

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen (F11)'}
              className="p-2 text-[#787c99] hover:text-[#c0caf5] hover:bg-[#1f1f28] rounded-md transition-all duration-150"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden flex">
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={`h-full ${viewMode === 'split' ? 'w-1/2 border-r border-[#2a2b3d]' : 'w-full'}`}>
            {extensions.length > 0 && (
              <CodeMirror
                ref={editorRef}
                value={value}
                onChange={onChange}
                extensions={extensions}
                theme="dark"
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLineGutter: true,
                  highlightSpecialChars: true,
                  history: true,
                  foldGutter: true,
                  drawSelection: true,
                  dropCursor: true,
                  allowMultipleSelections: true,
                  indentOnInput: true,
                  syntaxHighlighting: true,
                  bracketMatching: true,
                  closeBrackets: true,
                  autocompletion: true,
                  rectangularSelection: true,
                  crosshairCursor: false,
                  highlightActiveLine: true,
                  highlightSelectionMatches: true,
                  closeBracketsKeymap: true,
                  defaultKeymap: true,
                  searchKeymap: true,
                  historyKeymap: true,
                  foldKeymap: true,
                  completionKeymap: true,
                  lintKeymap: true,
                }}
                editable={!readOnly}
                className="h-full text-[15px]"
                style={{ height: '100%' }}
              />
            )}
          </div>
        )}

        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`h-full ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
            <PreviewPane content={value} previewRef={previewRef} />
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewPane({ content, previewRef }: { content: string; previewRef?: React.RefObject<HTMLDivElement> }) {
  const [ReactMarkdown, setReactMarkdown] = useState<any>(null);
  const [remarkGfm, setRemarkGfm] = useState<any>(null);
  const [rehypeHighlight, setRehypeHighlight] = useState<any>(null);
  const [rehypeRaw, setRehypeRaw] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      import('react-markdown'),
      import('remark-gfm'),
      import('rehype-highlight'),
      import('rehype-raw'),
    ]).then(([rm, rgfm, rhl, rraw]) => {
      setReactMarkdown(() => rm.default);
      setRemarkGfm(() => rgfm.default);
      setRehypeHighlight(() => rhl.default);
      setRehypeRaw(() => rraw.default);
    });
  }, []);

  if (!ReactMarkdown) {
    return (
      <div className="h-full flex items-center justify-center text-[#787c99] bg-[#0d0d11]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading preview...</span>
        </div>
      </div>
    );
  }

  const previewComponents: Components = {
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
      <p className="text-[#a9b1d6] leading-relaxed mb-4">{children}</p>
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
      <ul className="list-disc list-inside text-[#a9b1d6] mb-4 space-y-1">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside text-[#a9b1d6] mb-4 space-y-1">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="text-[#a9b1d6]">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-[#7c3aed] bg-[#1a1b26] pl-4 py-3 my-4 rounded-r-lg italic text-[#9aa5ce]">
        {children}
      </blockquote>
    ),
    code: ({ className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      const isInline = !match;

      if (isInline) {
        return (
          <code className="bg-[#1a1b26] text-[#f7768e] px-1.5 py-0.5 rounded text-sm font-mono">
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
      <pre className="bg-[#1a1b26] border border-[#2a2b3d] rounded-lg p-4 overflow-x-auto my-4 text-sm">
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-[#2a2b3d] rounded-lg overflow-hidden">
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th className="bg-[#1a1b26] border border-[#2a2b3d] px-4 py-2 text-left text-[#c0caf5] font-semibold">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-[#2a2b3d] px-4 py-2 text-[#a9b1d6]">
        {children}
      </td>
    ),
    hr: () => <hr className="border-[#2a2b3d] my-8" />,
    img: ({ src, alt }) => (
      <img
        src={src || ''}
        alt={alt || ''}
        className="max-w-full h-auto rounded-lg shadow-lg my-4"
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
  };

  return (
    <div className="h-full overflow-auto bg-[#0d0d11]" ref={previewRef}>
      <div className="sticky top-0 z-10 px-6 py-2 bg-[#0d0d11]/80 backdrop-blur-sm border-b border-[#1f1f28]">
        <span className="text-xs font-medium text-[#565869] uppercase tracking-wider">Preview</span>
      </div>
      <article className="prose prose-invert prose-lg max-w-none p-6 md:p-8">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight, rehypeRaw]}
          components={previewComponents}
        >
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
