import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Edit3, Eye, Search, Filter, RefreshCw, Star } from 'lucide-react';
import { api } from '../api';
import type { Post } from '../types';

interface DashboardProps {
  onEditPost?: (id: number) => void;
  onNewPost?: () => void;
}

export default function Dashboard({ onEditPost, onNewPost }: DashboardProps) {
  const { t, i18n } = useTranslation();
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

  const toggleCarousel = async (post: Post) => {
    const newOrder = post.carousel_order > 0 ? 0 : 1;
    try {
      await api.updateCarouselOrder(post.id, newOrder);
      setPosts(posts.map(p => p.id === post.id ? { ...p, carousel_order: newOrder } : p));
    } catch (error) {
      console.error('Failed to update carousel:', error);
    }
  };

  const carouselCount = posts.filter(p => p.carousel_order > 0).length;

  const deletePost = async (id: number) => {
    if (!confirm(t('admin.confirmDelete'))) return;
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
    carousel: carouselCount,
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] p-4 md:p-8 font-mono">
      <div className="max-w-7xl mx-auto">
        {/* 顶部控制栏 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 mb-8 md:mb-12 border-b border-[var(--color-border-surface)] pb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-wider text-[var(--color-text-primary)] mb-2">
              <span className="text-emerald-500">&gt;</span> {t('admin.coreConsole')}
            </h1>
            <p className="text-[var(--color-text-muted)] text-sm">
              <span className="text-[var(--color-text-muted)]">//</span> {t('admin.coreConsoleDesc')}
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
              <span>{t('admin.newArticle')}</span>
            </motion.button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
          {[
            { label: t('admin.totalArticles'), value: stats.total, color: 'text-blue-400' },
            { label: t('admin.published'), value: stats.published, color: 'text-emerald-400' },
            { label: t('admin.drafts'), value: stats.draft, color: 'text-amber-400' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-[var(--color-bg-card)] border border-[var(--color-border-surface)] rounded-xl p-5"
            >
              <p className="text-[var(--color-text-muted)] text-xs mb-2">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* 搜索和过滤栏 */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder={t('admin.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border-surface)] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-[var(--color-text-muted)]" />
            {['all', 'draft', 'published'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as typeof filter)}
                className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all ${
                  filter === f
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-[var(--color-bg-card)] border border-[var(--color-border-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]'
                }`}
              >
                {t(`admin.${f === 'all' ? 'all' : f}`)}
              </button>
            ))}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setRefreshKey(k => k + 1)}
              className="p-2 bg-[var(--color-bg-card)] border border-[var(--color-border-surface)] rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
            >
              <RefreshCw size={14} />
            </motion.button>
          </div>
        </div>

        {/* 文章列表 */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                <p className="text-[var(--color-text-muted)] font-mono text-sm">{t('admin.loadingData')}</p>
              </div>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-20 text-[var(--color-text-muted)]">
              <p className="text-4xl mb-4">📭</p>
              <p className="font-mono text-sm">{t('admin.noArticlesFound')}</p>
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
                  className="group relative flex items-center justify-between p-5 bg-[var(--color-bg-card)] border border-[var(--color-border-surface)] rounded-xl overflow-hidden hover:border-[var(--color-accent)] transition-all duration-300"
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
                      <h3 className="font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors text-lg">
                        {post.title}
                      </h3>
                      <div className="flex items-center gap-4 mt-1.5">
                        <span className="text-xs text-[var(--color-text-muted)] font-mono">
                          <span className="text-[var(--color-text-muted)]">{t('admin.slug')}:</span> {post.slug}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">•</span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {post.tags && post.tags.split(',').map(tag => (
                            <span key={tag} className="inline-block bg-[var(--color-bg-secondary)] px-2 py-0.5 rounded mr-1 text-[var(--color-text-secondary)]">
                              #{tag.trim()}
                            </span>
                          ))}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1.5 font-mono">
                        {t('admin.syncedAt')}: {new Date(post.updated_at).toLocaleString(i18n.language === 'zh' ? 'zh-CN' : 'en-US')}
                      </p>
                    </div>
                  </div>

                  <div className="relative flex items-center gap-1 md:gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleCarousel(post)}
                      className={`p-2 hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors ${
                        post.carousel_order > 0 ? 'text-amber-400' : 'text-[var(--color-text-muted)] hover:text-amber-400'
                      }`}
                      title={post.carousel_order > 0 ? `Carousel #${post.carousel_order}` : 'Add to carousel'}
                    >
                      <Star size={16} fill={post.carousel_order > 0 ? 'currentColor' : 'none'} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 hover:bg-[var(--color-bg-secondary)] rounded-lg text-[var(--color-text-muted)] hover:text-emerald-400 transition-colors"
                      title={t('admin.preview')}
                    >
                      <Eye size={16} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onEditPost?.(post.id)}
                      className="p-2 hover:bg-[var(--color-bg-secondary)] rounded-lg text-[var(--color-text-muted)] hover:text-blue-400 transition-colors"
                      title={t('admin.edit')}
                    >
                      <Edit3 size={16} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => deletePost(post.id)}
                      className="p-2 hover:bg-[var(--color-bg-secondary)] rounded-lg text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
                      title={t('admin.delete')}
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
        <div className="mt-8 pt-4 border-t border-[var(--color-border-surface)] flex justify-between items-center text-xs text-[var(--color-text-muted)] font-mono">
          <span>{t('admin.sysStatus')}: <span className="text-emerald-500">{t('admin.online')}</span></span>
          <span>{t('admin.lastSync')}: {new Date().toLocaleString(i18n.language === 'zh' ? 'zh-CN' : 'en-US')}</span>
        </div>
      </div>
    </div>
  );
}








