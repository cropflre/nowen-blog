import { useState, useEffect } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { ArrowLeft, Share2, Clock, Activity, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import type { Post } from '../types';
import MagneticElement from '../components/MagneticElement';

// 数字呼吸骨架屏组件
function ArticleSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      {/* 元数据骨架 */}
      <div className="flex items-center gap-4">
        <div className="h-3 bg-zinc-800/80 w-24 rounded" />
        <div className="h-3 bg-zinc-800/60 w-4 rounded" />
        <div className="h-3 bg-zinc-800/80 w-20 rounded" />
      </div>
      
      {/* 标题骨架 */}
      <div className="space-y-3">
        <div className="h-12 bg-zinc-800/80 w-3/4 rounded-lg" />
        <div className="h-12 bg-zinc-800/60 w-1/2 rounded-lg" />
      </div>
      
      {/* 标签骨架 */}
      <div className="flex gap-2 mt-6">
        <div className="h-6 bg-emerald-900/20 w-16 rounded-full border border-emerald-800/20" />
        <div className="h-6 bg-emerald-900/20 w-20 rounded-full border border-emerald-800/20" />
        <div className="h-6 bg-emerald-900/20 w-14 rounded-full border border-emerald-800/20" />
      </div>
      
      {/* 分隔线 */}
      <div className="border-b border-zinc-800/40 pb-8" />
      
      {/* 内容骨架 */}
      <div className="space-y-4">
        <div className="h-4 bg-zinc-800/50 w-full rounded" />
        <div className="h-4 bg-zinc-800/50 w-full rounded" />
        <div className="h-4 bg-zinc-800/50 w-5/6 rounded" />
        <div className="h-4 bg-zinc-800/50 w-full rounded" />
        <div className="h-4 bg-zinc-800/50 w-4/5 rounded" />
      </div>
      
      {/* 代码块骨架 */}
      <div className="mt-8 bg-zinc-900/80 rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full bg-zinc-800" />
          <div className="w-3 h-3 rounded-full bg-zinc-800" />
          <div className="w-3 h-3 rounded-full bg-zinc-800" />
          <div className="h-3 bg-zinc-800/60 w-20 ml-auto rounded" />
        </div>
        <div className="h-4 bg-zinc-800/40 w-3/4 rounded" />
        <div className="h-4 bg-zinc-800/40 w-full rounded" />
        <div className="h-4 bg-zinc-800/40 w-2/3 rounded" />
        <div className="h-4 bg-zinc-800/40 w-5/6 rounded" />
      </div>
      
      {/* 更多内容骨架 */}
      <div className="space-y-4">
        <div className="h-4 bg-zinc-800/50 w-full rounded" />
        <div className="h-4 bg-zinc-800/50 w-full rounded" />
        <div className="h-4 bg-zinc-800/50 w-3/4 rounded" />
      </div>
    </div>
  );
}

export default function ArticleDetail() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  
  const [article, setArticle] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // 进度条阻尼动画
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  // 发起对 Go 引擎的数据请求
  useEffect(() => {
    if (!slug) {
      setTimeout(() => { setError(true); setLoading(false); }, 0);
      return;
    }

    const fetchArticle = async () => {
      try {
        const data = await api.getPublicPost(slug);
        setArticle(data);
      } catch (err) {
        console.error('Failed to fetch article:', err);
        setTimeout(() => setError(true), 0);
      } finally {
        setTimeout(() => setLoading(false), 0);
      }
    };

    fetchArticle();
  }, [slug]);

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Vibe: 极简的 404 错误页
  if (error) {
    return (
      <div className="h-screen bg-[#050505] flex flex-col items-center justify-center text-zinc-500 font-mono">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Activity size={48} className="text-red-500/60 mb-4" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm"
        >
          404_ERR: DATA_CORRUPTED_OR_MISSING
        </motion.p>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          onClick={() => navigate('/blog')}
          className="mt-8 text-emerald-500 hover:text-emerald-400 transition-colors text-sm"
        >
          {'>'} Return to Index_
        </motion.button>
      </div>
    );
  }

  // 解析标签
  const tags = article?.tags ? article.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* 全局顶部滚动进度条 (极致极客感) */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-0.5 bg-emerald-500 origin-left z-50 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
        style={{ scaleX }}
      />

      {/* 左侧悬浮导航 (毛玻璃 + 磁性吸附) */}
      <div className="fixed top-8 left-8 md:top-12 md:left-12 z-40">
        <MagneticElement strength={0.4}>
          <motion.button
            onClick={() => navigate('/blog')}
            whileHover={{ scale: 1.1, x: -5 }}
            whileTap={{ scale: 0.95 }}
            className="p-3 rounded-full bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all shadow-lg"
          >
            <ArrowLeft size={20} />
          </motion.button>
        </MagneticElement>
      </div>

      {/* 居中核心阅读区 */}
      <motion.main 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} // Apple 风格的非线性缓动
        className="max-w-3xl mx-auto px-6 py-24 md:py-32"
      >
        {loading || !article ? (
          // Vibe: 数字呼吸骨架屏
          <ArticleSkeleton />
        ) : (
          // 真实数据渲染
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* 文章头部元数据 */}
            <header className="mb-16 border-b border-zinc-800/60 pb-12">
              <div className="flex items-center gap-4 text-xs font-mono text-zinc-500 mb-6">
                <span className="flex items-center gap-1.5">
                  <Clock size={14} /> {article.read_time} MIN READ
                </span>
                <span>//</span>
                <span>{formatDate(article.created_at)}</span>
                <span>//</span>
                <span className="flex items-center gap-1.5">
                  <Eye size={14} /> {article.view_count} VIEWS
                </span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-zinc-100 leading-[1.2]">
                {article.title}
              </h1>
              
              {/* 标签 */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              
              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: article.title,
                        url: window.location.href
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      // 极客风提示
                      const el = document.createElement('div');
                      el.className = 'fixed bottom-8 right-8 bg-zinc-900 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-lg font-mono text-sm z-50';
                      el.textContent = '> link copied to clipboard_';
                      document.body.appendChild(el);
                      setTimeout(() => el.remove(), 2000);
                    }
                  }}
                  className="text-xs font-medium px-4 py-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors flex items-center gap-2"
                >
                  <Share2 size={14} /> SHARE_LOG
                </button>
              </div>
            </header>

            {/* 文章正文区：优先使用服务端预渲染的 HTML */}
            <article className="prose prose-invert prose-zinc max-w-none prose-p:leading-relaxed prose-p:text-zinc-400 prose-headings:text-zinc-200 prose-headings:font-medium">
              {article.html_content ? (
                <div dangerouslySetInnerHTML={{ __html: article.html_content }} />
              ) : (
                <ReactMarkdown>{article.content}</ReactMarkdown>
              )}
            </article>

            {/* 文章底部导航 */}
            <footer className="mt-20 pt-12 border-t border-zinc-800/60">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => navigate('/blog')}
                  className="text-sm text-zinc-500 hover:text-emerald-400 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft size={16} />
                  {'>'} cd ../blog
                </button>
                
                <div className="text-xs font-mono text-zinc-600">
                  id:{article.id} | status:{article.status}
                </div>
              </div>
            </footer>
          </motion.div>
        )}
      </motion.main>
    </div>
  );
}
