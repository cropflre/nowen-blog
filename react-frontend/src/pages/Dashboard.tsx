import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit3, Eye, Search, Filter, RefreshCw } from 'lucide-react';
import { api } from '../api';
import type { Post } from '../types';

interface DashboardProps {
  onEditPost?: (id: number) => void;
  onNewPost?: () => void;
}

export default function Dashboard({ onEditPost, onNewPost }: DashboardProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadPosts = async () => {
      try {
        const response = await api.adminGetPosts({
          status: filter === 'all' ? undefined : filter,
          pageSize: 50,
        });
        if (!cancelled) {
          setPosts(response.data);
          setLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch posts:', error);
          setLoading(false);
        }
      }
    };
    loadPosts();
    return () => { cancelled = true; };
  }, [filter, refreshKey]);

  const deletePost = async (id: number) => {
    if (!confirm('确定要删除这篇文章吗？')) return;
    try {
      await api.deletePost(id);
      setPosts(posts.filter(post => post.id !== id));
    } catch (error) {
      console.error('Failed to delete post:', error);
    }
  };

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: posts.length,
    published: posts.filter(p => p.status === 'published').length,
    draft: posts.filter(p => p.status === 'draft').length,
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-200 p-8 font-mono">
      <div className="max-w-7xl mx-auto">
        {/* 顶部控制栏 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-wider text-white mb-2">
              <span className="text-emerald-500">&gt;</span> CORE_CONSOLE
            </h1>
            <p className="text-zinc-500 text-sm">
              <span className="text-zinc-600">//</span> 项目文档与技术日志中央管理系统
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(16, 185, 129, 0.2)" }}
              whileTap={{ scale: 0.98 }}
              onClick={onNewPost}
              className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-500/20 transition-all"
            >
              <Plus size={16} />
              <span>NEW_ARTICLE</span>
            </motion.button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'TOTAL_ARTICLES', value: stats.total, color: 'text-blue-400' },
            { label: 'PUBLISHED', value: stats.published, color: 'text-emerald-400' },
            { label: 'DRAFTS', value: stats.draft, color: 'text-amber-400' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5"
            >
              <p className="text-zinc-500 text-xs mb-2">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* 搜索和过滤栏 */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="搜索文章标题或 slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-zinc-500" />
            <div className="flex bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
              {(['all', 'published', 'draft'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 text-xs font-medium transition-all ${
                    filter === status
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {status.toUpperCase()}
                </button>
              ))}
            </div>
            
            <motion.button
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
              onClick={() => setRefreshKey(k => k + 1)}
              className="p-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            >
              <RefreshCw size={16} />
            </motion.button>
          </div>
        </div>

        {/* 文章列表 */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-20 text-zinc-500">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 border-zinc-700 border-t-emerald-500 rounded-full mx-auto mb-4"
              />
              <p className="font-mono text-sm">LOADING_DATA...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-20 text-zinc-500">
              <p className="text-4xl mb-4">📭</p>
              <p className="font-mono text-sm">NO_ARTICLES_FOUND</p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredPosts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, padding: 0, marginBottom: 0 }}
                  transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1], delay: index * 0.05 }}
                  className="group relative flex items-center justify-between p-5 bg-zinc-900/40 border border-zinc-800/60 rounded-xl overflow-hidden hover:border-zinc-700 transition-all duration-300"
                >
                  {/* 悬浮光效 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative flex items-center gap-4">
                    {/* 状态指示灯 */}
                    <div className="relative">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        post.status === 'published' 
                          ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                          : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                      }`} />
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-zinc-100 group-hover:text-white transition-colors text-lg">
                        {post.title}
                      </h3>
                      <div className="flex items-center gap-4 mt-1.5">
                        <span className="text-xs text-zinc-500 font-mono">
                          <span className="text-zinc-600">slug:</span> {post.slug}
                        </span>
                        <span className="text-xs text-zinc-600">•</span>
                        <span className="text-xs text-zinc-500">
                          {post.tags && post.tags.split(',').map(tag => (
                            <span key={tag} className="inline-block bg-zinc-800/50 px-2 py-0.5 rounded mr-1 text-zinc-400">
                              #{tag.trim()}
                            </span>
                          ))}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 mt-1.5 font-mono">
                        SYNCED_AT: {new Date(post.updated_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>

                  <div className="relative flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-emerald-400 transition-colors"
                      title="预览"
                    >
                      <Eye size={16} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onEditPost?.(post.id)}
                      className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-blue-400 transition-colors"
                      title="编辑"
                    >
                      <Edit3 size={16} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => deletePost(post.id)}
                      className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-400 transition-colors"
                      title="删除"
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* 底部状态栏 */}
        <div className="mt-8 pt-4 border-t border-zinc-800/50 flex justify-between items-center text-xs text-zinc-600 font-mono">
          <span>SYS_STATUS: <span className="text-emerald-500">ONLINE</span></span>
          <span>LAST_SYNC: {new Date().toLocaleString('zh-CN')}</span>
        </div>
      </div>
    </div>
  );
}
