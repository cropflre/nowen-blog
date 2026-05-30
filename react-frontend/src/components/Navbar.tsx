import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

const useNavLinks = () => {
  const { t } = useTranslation();
  return [
    { path: '/', label: t('nav.home') },
    { path: '/blog', label: t('nav.blog') },
    { path: '/projects', label: t('nav.projects') },
  ];
};

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const navLinks = useNavLinks();

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  return (
    <>
      {/* 统一胶囊导航 - 与首页风格一致 */}
      <motion.nav
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3.5 rounded-full backdrop-blur-xl shadow-2xl hero-nav"
      >
        {/* 品牌 */}
        <Link to="/" className="flex items-center gap-4 px-5 py-2.5 rounded-full font-bold tracking-wider text-lg transition-colors hero-nav-link" style={{ color: 'var(--color-hero-text)' }}>
          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))' }}>
            <span className="text-xs text-white">N</span>
          </div>
          <span className="hidden sm:inline">nowen-blog</span>
        </Link>

        {/* 分隔线 */}
        <div className="hidden md:block w-px h-6 mx-3" style={{ background: 'var(--color-hero-border)' }} />

        {/* 桌面导航链接 */}
        <div className="hidden md:flex items-center gap-3">
          {navLinks.map((link) => {
            const isActive = link.path === '/' 
              ? location.pathname === '/' 
              : location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className="relative px-8 py-3 text-lg font-medium rounded-full transition-colors hero-nav-link"
                style={{ color: isActive ? 'var(--color-hero-text)' : 'var(--color-hero-text-secondary)' }}
              >
                {link.label}
                {isActive && (
                  <motion.div
                    layoutId="hero-nav-indicator"
                    className="absolute inset-0 rounded-full"
                    style={{ background: 'var(--color-hero-card)', border: '1px solid var(--color-hero-border)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* 桌面操作按钮 */}
        <div className="hidden md:flex items-center gap-3 ml-3">
          {/* 分隔线 */}
          <div className="w-px h-6 mx-3" style={{ background: 'var(--color-hero-border)' }} />

          {/* GitHub */}
          <a
            href="https://github.com/cropflre"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 rounded-full text-lg font-medium transition-colors hero-nav-link"
            style={{ color: 'var(--color-hero-text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>

          {/* 主题切换 */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-11 h-11 rounded-full transition-colors hero-nav-link"
            style={{ color: 'var(--color-hero-text-secondary)' }}
            title={theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
          >
            {theme === 'dark' ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* 语言切换 */}
          <button
            onClick={() => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')}
            className="px-5 py-2.5 rounded-full text-base font-medium transition-colors hero-nav-link"
            style={{ color: 'var(--color-hero-text-secondary)' }}
          >
            {i18n.language === 'zh' ? 'EN' : '中'}
          </button>
        </div>
        
        {/* 移动端菜单按钮 */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden relative w-11 h-11 flex flex-col items-center justify-center gap-1.5 rounded-full"
          style={{ color: 'var(--color-hero-text-secondary)' }}
        >
          <motion.span
            animate={mobileOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
            className="w-6 h-[2px] block"
            style={{ background: 'currentColor' }}
          />
          <motion.span
            animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }}
            className="w-6 h-[2px] block"
            style={{ background: 'currentColor' }}
          />
          <motion.span
            animate={mobileOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
            className="w-6 h-[2px] block"
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
            style={{ background: 'var(--color-hero-overlay)', backdropFilter: 'blur(20px)' }}
          >
            <div className="flex flex-col gap-2">
              {navLinks.map((link, i) => {
                const isActive = link.path === '/' 
                  ? location.pathname === '/' 
                  : location.pathname.startsWith(link.path);
                return (
                  <motion.div
                    key={link.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Link
                      to={link.path}
                      className="block text-3xl font-medium py-3 border-b"
                      style={{ 
                        borderColor: 'var(--color-hero-border)',
                        color: isActive ? 'var(--color-cyan)' : 'var(--color-hero-text-secondary)'
                      }}
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                );
              })}
              <div className="mt-6 flex gap-4">
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-lg text-xl font-medium transition-all duration-300"
                  style={{ 
                    color: 'var(--color-hero-text-secondary)',
                    background: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--color-hero-text)';
                    e.currentTarget.style.background = 'var(--color-hero-card)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--color-hero-text-secondary)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {theme === 'dark' ? (
                    <>
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      {t('nav.lightMode')}
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                      {t('nav.darkMode')}
                    </>
                  )}
                </button>
                <button
                  onClick={() => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-lg text-xl font-medium transition-all duration-300"
                  style={{ 
                    color: 'var(--color-hero-text-secondary)',
                    background: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--color-hero-text)';
                    e.currentTarget.style.background = 'var(--color-hero-card)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--color-hero-text-secondary)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {i18n.language === 'zh' ? 'English' : '中文'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}