import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, Github, Star, ChevronRight, Terminal, ExternalLink, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import type { Content, DocTreeItem } from '../types';
import TerminalBlock from '../components/TerminalBlock';

// 骨架屏：侧边栏
function SidebarSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-8 bg-zinc-800/40 rounded-lg animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
      ))}
    </div>
  );
}

// 骨架屏：内容区
function ContentSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-zinc-800/60 w-3/4 rounded-lg" />
      <div className="space-y-3">
        <div className="h-4 bg-zinc-800/40 w-full rounded" />
        <div className="h-4 bg-zinc-800/40 w-5/6 rounded" />
        <div className="h-4 bg-zinc-800/40 w-full rounded" />
      </div>
      <div className="h-48 bg-zinc-900/60 rounded-xl" />
      <div className="space-y-3">
        <div className="h-4 bg-zinc-800/40 w-full rounded" />
        <div className="h-4 bg-zinc-800/40 w-4/5 rounded" />
      </div>
    </div>
  );
}

export default function ProjectDocs() {
  const navigate = useNavigate();
  const { project } = useParams<{ project: string }>();
  
  const [docTree, setDocTree] = useState<DocTreeItem[]>([]);
  const [activeSlug, setActiveSlug] = useState<string>('');
  const [currentDoc, setCurrentDoc] = useState<Content | null>(null);
  const [githubStars, setGithubStars] = useState<number>(0);
  const [githubURL, setGithubURL] = useState<string>('');
  const [loadingTree, setLoadingTree] = useState(true);
  const [loadingContent, setLoadingContent] = useState(true);
  const [projectDisplayName, setProjectDisplayName] = useState('');

  // 获取文档目录树
  useEffect(() => {
    if (!project) return;

    const fetchTree = async () => {
      try {
        setLoadingTree(true);
        const res = await api.getDocTree(project);
        setDocTree(res.data);
        setGithubURL(res.github_url);
        setProjectDisplayName(project.replace(/-/g, ' ').toUpperCase());
        
        // 默认选中第一个文档
        if (res.data.length > 0) {
          setActiveSlug(res.data[0].slug);
        }
      } catch (err) {
        console.error('Failed to fetch doc tree:', err);
      } finally {
        setLoadingTree(false);
      }
    };

    fetchTree();
  }, [project]);

  // 获取当前文档内容
  useEffect(() => {
    if (!activeSlug) return;

    const fetchContent = async () => {
      try {
        setLoadingContent(true);
        const data = await api.getContentBySlug(activeSlug);
        setCurrentDoc(data);
      } catch (err) {
        console.error('Failed to fetch content:', err);
        setCurrentDoc(null);
      } finally {
        setLoadingContent(false);
      }
    };

    fetchContent();
  }, [activeSlug]);

  // 获取 GitHub Stars
  useEffect(() => {
    if (!githubURL) return;

    const fetchStars = async () => {
      try {
        // 从 URL 提取 owner/repo
        const match = githubURL.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (!match) return;
        
        const res = await fetch(`https://api.github.com/repos/${match[1]}/${match[2]}`);
        const data = await res.json();
        setGithubStars(data.stargazers_count || 0);
      } catch {
        setGithubStars(0);
      }
    };

    fetchStars();
  }, [githubURL]);

  const handleDocClick = useCallback((slug: string) => {
    setActiveSlug(slug);
  }, []);

  const currentTitle = docTree.find(d => d.slug === activeSlug)?.title || '';

  return (
    <div className="min-h-screen bg-[#050505] flex font-sans text-zinc-300 overflow-hidden">
      
      {/* 左侧：文档导航树 (毛玻璃侧边栏) */}
      <aside className="w-72 border-r border-zinc-800/80 bg-[#030303]/95 backdrop-blur-xl flex flex-col h-screen sticky top-0 shrink-0">
        
        {/* 返回按钮 + 项目标识区 */}
        <div className="p-5 border-b border-zinc-800/60">
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-emerald-400 transition-colors mb-4 group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span>{'>'} cd ../projects</span>
          </button>
          
          <div className="flex items-center gap-3 text-white mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Terminal size={16} className="text-emerald-500" />
            </div>
            <span className="font-semibold tracking-wider text-sm">{projectDisplayName}</span>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-mono">
            {githubURL && (
              <a
                href={githubURL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors"
              >
                <Github size={12} />
                <span>Repo</span>
                <ExternalLink size={10} />
              </a>
            )}
            <span className="flex items-center gap-1.5 text-amber-400/80">
              <Star size={12} className="fill-amber-400/80" />
              <span>{githubStars > 0 ? githubStars.toLocaleString() : '...'}</span>
            </span>
          </div>
        </div>

        {/* 目录导航区 */}
        <nav className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          <div className="text-[10px] font-mono text-zinc-600 mb-3 px-3 tracking-[0.2em] uppercase">
            Documentation
          </div>
          
          {loadingTree ? (
            <SidebarSkeleton />
          ) : (
            <div className="space-y-0.5">
              {docTree.map((item) => {
                const isActive = activeSlug === item.slug;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleDocClick(item.slug)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all relative group ${
                      isActive 
                        ? 'text-white' 
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                    }`}
                  >
                    <span className="relative z-10 flex items-center gap-2 truncate">
                      {isActive && (
                        <ChevronRight size={14} className="text-emerald-500 shrink-0" />
                      )}
                      <span className="truncate">{item.title}</span>
                    </span>
                    
                    {/* 阻尼滑动高亮背景 */}
                    {isActive && (
                      <motion.div
                        layoutId="activeDoc"
                        className="absolute inset-0 bg-zinc-800/60 rounded-lg border border-zinc-700/50"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        {/* 底部装饰 */}
        <div className="p-4 border-t border-zinc-800/40">
          <div className="text-[10px] font-mono text-zinc-700 text-center">
            {'>'} {docTree.length} documents indexed_
          </div>
        </div>
      </aside>

      {/* 右侧：核心阅读区 */}
      <main className="flex-1 h-screen overflow-y-auto relative scroll-smooth">
        {/* 顶部面包屑导航 */}
        <header className="h-14 border-b border-zinc-800/60 bg-[#050505]/80 backdrop-blur-md sticky top-0 z-30 px-8 flex items-center gap-2 text-sm font-mono text-zinc-500">
          <Book size={14} className="text-zinc-600" />
          <span className="text-zinc-400">{projectDisplayName}</span>
          <ChevronRight size={12} className="text-zinc-700" />
          <AnimatePresence mode="wait">
            <motion.span
              key={currentTitle}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 5 }}
              className="text-zinc-300"
            >
              {currentTitle}
            </motion.span>
          </AnimatePresence>
        </header>

        {/* 正文渲染区 */}
        <div className="max-w-4xl mx-auto px-8 py-12">
          {loadingContent ? (
            <ContentSkeleton />
          ) : currentDoc ? (
            <AnimatePresence mode="wait">
              <motion.article
                key={activeSlug}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="prose prose-invert prose-zinc max-w-none 
                  prose-headings:font-medium prose-headings:tracking-tight
                  prose-h1:text-3xl prose-h1:mb-8
                  prose-h2:text-xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:text-zinc-200
                  prose-p:leading-relaxed prose-p:text-zinc-400
                  prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline
                  prose-code:text-emerald-300 prose-code:bg-zinc-800/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm
                  prose-pre:bg-transparent prose-pre:p-0
                  prose-strong:text-zinc-200
                  prose-blockquote:border-emerald-500/30 prose-blockquote:text-zinc-400"
              >
                {currentDoc.html_content ? (
                  <div dangerouslySetInnerHTML={{ __html: currentDoc.html_content }} />
                ) : (
                  <ReactMarkdown
                    components={{
                      code({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode; [key: string]: unknown }) {
                        const match = /language-(\w+)/.exec(className || '');
                        if (!inline && match) {
                          return <TerminalBlock code={String(children).replace(/\n$/, '')} language={match[1]} />;
                        }
                        return <code className={className} {...props}>{children}</code>;
                      }
                    }}
                  >
                    {currentDoc.content}
                  </ReactMarkdown>
                )}
              </motion.article>
            </AnimatePresence>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-600">
              <Terminal size={32} className="mb-4 opacity-50" />
              <p className="font-mono text-sm">404: DOCUMENT_NOT_FOUND</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
