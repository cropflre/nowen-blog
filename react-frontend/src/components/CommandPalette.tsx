import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Book, ArrowUp, ArrowDown, CornerDownLeft, X } from 'lucide-react';
import { api } from '../api';
import type { SearchResult } from '../types';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // 全局快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K / Ctrl+K 唤起
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        return;
      }

      // ESC 关闭
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // 打开时自动聚焦
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // 搜索请求（带防抖）
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.searchContents(query);
        setResults(data);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // 键盘导航
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
    }
  }, [results, selectedIndex]);

  // 选择结果
  const handleSelect = (item: SearchResult) => {
    setIsOpen(false);
    if (item.type === 'doc' && item.project_name) {
      navigate(`/docs/${item.project_name}`);
    } else {
      navigate(`/blog/${item.slug}`);
    }
  };

  // 获取类型图标
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'blog':
        return <FileText className="w-4 h-4 text-cyan-400" />;
      case 'doc':
        return <Book className="w-4 h-4 text-purple-400" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  // 获取类型标签
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'blog':
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-400 rounded">
            Blog
          </span>
        );
      case 'doc':
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400 rounded">
            Doc
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 毛玻璃背景 */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />

          {/* 命令面板 */}
          <motion.div
            className="fixed top-[20%] left-1/2 w-full max-w-2xl -translate-x-1/2 z-50"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="bg-[#0a0a0f]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              {/* 搜索输入区 */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
                <Search className="w-5 h-5 text-white/40" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search across the NOWEN universe..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent text-white placeholder-white/40 outline-none font-mono text-sm"
                />
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-white/40 bg-white/5 rounded border border-white/10">
                  ESC
                </kbd>
              </div>

              {/* 结果列表 */}
              <div className="max-h-80 overflow-y-auto custom-scrollbar">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                  </div>
                ) : results.length > 0 ? (
                  <div className="py-2">
                    {results.map((item, index) => (
                      <button
                        key={`${item.type}-${item.id}`}
                        onClick={() => handleSelect(item)}
                        className={`w-full flex items-start gap-3 px-5 py-3 text-left transition-colors ${
                          index === selectedIndex
                            ? 'bg-white/10'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="mt-0.5">{getTypeIcon(item.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium truncate">{item.title}</span>
                            {getTypeBadge(item.type)}
                          </div>
                          {item.summary && (
                            <p className="text-xs text-white/40 truncate mt-1">{item.summary}</p>
                          )}
                          {item.project_name && (
                            <span className="inline-block mt-1 text-[10px] font-mono text-purple-400/60">
                              /docs/{item.project_name}
                            </span>
                          )}
                        </div>
                        {index === selectedIndex && (
                          <CornerDownLeft className="w-3 h-3 text-white/20 mt-1.5" />
                        )}
                      </button>
                    ))}
                  </div>
                ) : query.trim() ? (
                  <div className="flex flex-col items-center justify-center py-12 text-white/40">
                    <X className="w-8 h-8 mb-3 opacity-20" />
                    <p className="text-sm font-mono">No results found for &quot;{query}&quot;</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-white/30">
                    <Search className="w-8 h-8 mb-3 opacity-20" />
                    <p className="text-sm font-mono">Type to search across blog & docs...</p>
                  </div>
                )}
              </div>

              {/* 底部导航提示 */}
              <div className="flex items-center gap-4 px-5 py-3 border-t border-white/10 text-[10px] font-mono text-white/30">
                <span className="flex items-center gap-1">
                  <ArrowUp className="w-3 h-3" />
                  <ArrowDown className="w-3 h-3" />
                  <span>Navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <CornerDownLeft className="w-3 h-3" />
                  <span>Open</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-white/5 rounded text-[10px]">ESC</kbd>
                  <span>Close</span>
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}