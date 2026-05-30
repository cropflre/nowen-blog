import { motion } from 'framer-motion';
import { Terminal, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function HeroRefactor() {
  const { t } = useTranslation();
  const techStack = ['Go', 'React', 'TypeScript', 'Docker', 'PostgreSQL', 'gRPC'];

  return (
    <div className="relative min-h-screen bg-[#050505] flex flex-col items-center justify-center font-sansSelection overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* 极简网格背景 (绝对赛博质感) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      {/* 顶部悬浮胶囊导航 */}
      <motion.nav 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="fixed top-6 z-50 flex items-center justify-between px-6 py-3 rounded-full bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl shadow-2xl w-full max-w-2xl"
      >
        <div className="flex items-center gap-2 font-bold text-white tracking-wider">
          <div className="w-5 h-5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-md flex items-center justify-center">
            <span className="text-[10px] text-white">C</span>
          </div>
          Cropflre
        </div>
        <div className="flex gap-6 text-sm font-medium text-zinc-400">
          <Link to="/" className="hover:text-white transition-colors">{t('nav.home')}</Link>
          <Link to="/blog" className="hover:text-white transition-colors">{t('nav.blog')}</Link>
          <Link to="/projects" className="hover:text-white transition-colors">{t('nav.projects')}</Link>
          <a href="https://github.com/cropflre" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </a>
        </div>
      </motion.nav>

      {/* 核心视觉展示区 */}
      <main className="relative z-10 flex flex-col items-center text-center px-6 mt-16 max-w-3xl">
        
        {/* 状态徽章 */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8 cursor-default"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-mono text-emerald-400 tracking-wide">{t('hero.status')}</span>
        </motion.div>

        {/* 像素头像融合 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="mb-8 p-1 rounded-2xl bg-gradient-to-b from-zinc-800 to-zinc-950 border border-zinc-800 shadow-2xl"
        >
          <div className="w-16 h-16 bg-black rounded-xl border border-zinc-800 flex items-center justify-center overflow-hidden">
            <img
              src="https://api.dicebear.com/7.x/bottts-neutral/svg?seed=cropflre&backgroundColor=0a0a0a"
              alt="avatar"
              className="w-12 h-12"
            />
          </div>
        </motion.div>

        {/* 巨型渐变标题 */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="text-6xl md:text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-indigo-300 to-purple-500 pb-2"
        >
          Cropflre
        </motion.h1>

        <motion.h2 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="text-xl md:text-2xl font-medium text-zinc-300 mt-4 flex items-center gap-2"
        >
          {t('hero.roles.fullStack')} <span className="w-1.5 h-6 bg-indigo-500 animate-pulse"></span>
        </motion.h2>

        {/* 个人简介 */}
        <motion.p 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-6 text-zinc-400 text-base md:text-lg max-w-xl leading-relaxed"
        >
          {t('hero.bio')}
        </motion.p>

        {/* 技术栈重构为质感标签 */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="flex flex-wrap justify-center gap-2 mt-8"
        >
          {techStack.map((tech) => (
            <span key={tech} className="px-3 py-1.5 text-xs font-mono text-zinc-400 bg-zinc-900/50 border border-zinc-800 rounded-md hover:border-zinc-600 hover:text-zinc-200 transition-colors">
              {tech}
            </span>
          ))}
        </motion.div>

        {/* 核心操作按钮 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="flex items-center gap-4 mt-12"
        >
          <Link to="/projects" className="group relative px-6 py-3 bg-zinc-100 text-black font-semibold rounded-xl flex items-center gap-2 hover:bg-white transition-colors overflow-hidden">
            <span className="relative z-10 flex items-center gap-2">
              <Terminal size={18} /> {t('hero.cta.viewProjects')}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-200 to-purple-200 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          
          <Link to="/blog" className="px-6 py-3 bg-zinc-900 text-zinc-300 font-medium rounded-xl border border-zinc-800 flex items-center gap-2 hover:bg-zinc-800 hover:text-white transition-colors">
            <BookOpen size={18} /> {t('hero.cta.readBlog')}
          </Link>
        </motion.div>
      </main>

      {/* 底部渐变遮罩 (融合感) */}
      <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none" />
    </div>
  );
}