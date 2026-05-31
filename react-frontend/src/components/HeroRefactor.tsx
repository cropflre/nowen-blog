import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, BookOpen } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

export default function HeroRefactor() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const techStack = ['Go', 'React', 'TypeScript', 'Docker', 'PostgreSQL', 'gRPC'];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center font-sansSelection overflow-hidden">
      
      {/* 顶部悬浮胶囊导航 - 毛玻璃科技风 */}
      <motion.nav 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-6 px-6 py-3 rounded-2xl backdrop-blur-xl shadow-2xl transition-all duration-300 hero-nav ${scrolled ? 'bg-white/85 shadow-lg' : 'bg-white/70'}`}
        style={{
          background: scrolled ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          boxShadow: scrolled ? '0 4px 20px rgba(0, 0, 0, 0.08)' : '0 2px 12px rgba(0, 0, 0, 0.06)'
        }}
      >
        {/* 品牌 */}
        <Link to="/" className="flex items-center gap-3 px-4 py-2 rounded-xl font-bold tracking-wider text-lg transition-colors hero-nav-link" style={{ color: 'var(--color-hero-text)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))' }}>
            <span className="text-xs text-white font-bold">N</span>
          </div>
          <span className="hidden sm:inline">nowen-blog</span>
        </Link>

        {/* 桌面导航链接 */}
        <div className="hidden md:flex items-center gap-2">
          {[
            { path: '/', label: t('nav.home') },
            { path: '/blog', label: t('nav.blog') },
            { path: '/projects', label: t('nav.projects') },
          ].map((link) => {
            const isActive = link.path === '/' 
              ? location.pathname === '/' 
              : location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`relative px-5 py-2.5 text-base font-medium rounded-xl transition-all duration-200 hero-nav-link ${
                  isActive ? 'text-purple-600 bg-purple-50/80 font-semibold' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/60'
                }`}
                style={{
                  color: isActive ? '#8b5cf6' : undefined,
                  background: isActive ? 'rgba(139, 92, 246, 0.1)' : undefined
                }}
              >
                {link.label}
                {isActive && (
                  <motion.div
                    layoutId="hero-nav-indicator"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* 桌面操作按钮 */}
        <div className="hidden md:flex items-center gap-2 ml-4">
          {/* GitHub */}
          <a
            href="https://github.com/cropflre"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 hero-nav-link"
            style={{ color: '#6b7280' }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>

          {/* 主题切换 */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 hero-nav-link"
            style={{ color: '#6b7280' }}
            title={theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* 语言切换 */}
          <button
            onClick={() => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hero-nav-link"
            style={{ color: '#6b7280' }}
          >
            {i18n.language === 'zh' ? 'EN' : '中'}
          </button>
        </div>
        
        {/* 移动端菜单按钮 */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden relative w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-xl transition-all duration-200"
          style={{ color: '#6b7280' }}
        >
          <motion.span
            animate={mobileOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
            className="w-5 h-[2px] block"
            style={{ background: 'currentColor' }}
          />
          <motion.span
            animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }}
            className="w-5 h-[2px] block"
            style={{ background: 'currentColor' }}
          />
          <motion.span
            animate={mobileOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
            className="w-5 h-[2px] block"
            style={{ background: 'currentColor' }}
          />
        </button>
      </motion.nav>
      
      {/* 移动端菜单 */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 pt-24 px-6 md:hidden"
            style={{ background: 'rgba(248, 250, 252, 0.95)', backdropFilter: 'blur(20px)' }}
          >
            <div className="flex flex-col gap-3">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                <Link
                  to="/"
                  className={`block text-2xl font-medium py-3 border-b transition-colors duration-200 ${
                    location.pathname === '/' ? 'text-purple-600 border-purple-200' : 'text-gray-600 border-gray-200 hover:text-gray-900'
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {t('nav.home')}
                </Link>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <Link
                  to="/blog"
                  className={`block text-2xl font-medium py-3 border-b transition-colors duration-200 ${
                    location.pathname.startsWith('/blog') ? 'text-purple-600 border-purple-200' : 'text-gray-600 border-gray-200 hover:text-gray-900'
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {t('nav.blog')}
                </Link>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <Link
                  to="/projects"
                  className={`block text-2xl font-medium py-3 border-b transition-colors duration-200 ${
                    location.pathname.startsWith('/projects') ? 'text-purple-600 border-purple-200' : 'text-gray-600 border-gray-200 hover:text-gray-900'
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {t('nav.projects')}
                </Link>
              </motion.div>
              <div className="mt-6 flex gap-4">
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-lg font-medium transition-all duration-200"
                  style={{ 
                    color: '#6b7280',
                    background: 'rgba(243, 244, 246, 0.6)'
                  }}
                >
                  {theme === 'dark' ? (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      {t('nav.lightMode')}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                      {t('nav.darkMode')}
                    </>
                  )}
                </button>
                <button
                  onClick={() => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-lg font-medium transition-all duration-200"
                  style={{ 
                    color: '#6b7280',
                    background: 'rgba(243, 244, 246, 0.6)'
                  }}
                >
                  {i18n.language === 'zh' ? 'English' : '中文'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 核心视觉展示区 */}
      <main className="relative z-10 flex flex-col items-center text-center px-6 pt-24 max-w-3xl">
        
        {/* 状态徽章 */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full mb-8 cursor-default hero-badge"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full hero-badge-dot opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 hero-badge-dot"></span>
          </span>
          <span className="text-xs font-mono tracking-wide hero-badge-text">{t('hero.status')}</span>
        </motion.div>

        {/* 像素头像融合 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="relative mb-8"
        >
          <div className="w-32 h-32 rounded-2xl bg-gray-900 dark:bg-gray-800 border-4 border-white dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 flex items-center justify-center overflow-hidden">
            <Terminal size={64} className="text-white" />
          </div>
          {/* 头像光晕效果 */}
          <div className="absolute -inset-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-3xl opacity-20 blur-xl animate-pulse"></div>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="text-5xl md:text-6xl font-bold mb-6 tracking-tight hero-role-text"
        >
          {t('hero.roles.fullStack')}
          <span className="inline-block w-1.5 h-12 ml-2 bg-purple-500 rounded-full animate-pulse"></span>
        </motion.h1>

        {/* 个人简介 */}
        <motion.p 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-10 leading-relaxed max-w-2xl mx-auto"
        >
          <Trans
            i18nKey="hero.bio"
            components={{
              strong: <span className="font-semibold" style={{ color: 'var(--color-cyan)' }} />
            }}
          />
        </motion.p>

        {/* 技术栈重构为质感标签 */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {techStack.map((tech, index) => (
            <span 
              key={tech}
              className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-sm transition-all duration-200 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105"
              style={{animationDelay: `${index * 0.1}s`}}
            >
              {tech}
            </span>
          ))}
        </motion.div>

        {/* 核心操作按钮 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link to="/projects" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-lg shadow-lg shadow-gray-900/20 dark:shadow-white/10 hover:shadow-xl hover:shadow-gray-900/30 dark:hover:shadow-white/20 hover:scale-105 transition-all duration-200">
            <Terminal size={20} /> {t('hero.cta.viewProjects')}
          </Link>
          
          <Link to="/blog" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold text-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105 transition-all duration-200">
            <BookOpen size={20} /> {t('hero.cta.readBlog')}
          </Link>
        </motion.div>
      </main>

      {/* 底部渐变遮罩 (融合感) */}
      <div className="absolute bottom-0 w-full h-32 pointer-events-none hero-gradient-overlay" />
    </div>
  );
}