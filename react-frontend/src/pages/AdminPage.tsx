import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation, Routes, Route, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LogOut, Settings, User as UserIcon, Sun, Moon, Globe, FileText, FolderOpen, Home, Menu, X, PenLine } from 'lucide-react';
import Dashboard from './Dashboard';
import ProjectDocsDashboard from './ProjectDocsDashboard';
import ArticleEditor from './ArticleEditor';
import SettingsPage from './SettingsPage';
import SiteSettingsPage from './SiteSettingsPage';

export default function AdminPage() {
  const { t, i18n } = useTranslation();
  const { user, logout, mustChangePassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [editingPostId, setEditingPostId] = useState<number | undefined>();
  const [contentType, setContentType] = useState<'blog' | 'doc'>('blog');

  const getActiveTab = () => {
    if (location.pathname.startsWith('/admin/docs')) return 'docs';
    if (location.pathname.startsWith('/admin/editor')) return 'editor';
    if (location.pathname.startsWith('/admin/settings')) return 'settings';
    return 'posts';
  };

  const activeTab = getActiveTab();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNewPost = () => {
    setEditingPostId(undefined);
    setContentType('blog');
    navigate('/admin/editor');
  };

  const handleNewDoc = () => {
    setEditingPostId(undefined);
    setContentType('doc');
    navigate('/admin/editor');
  };

  const handleEditPost = (id: number) => {
    setEditingPostId(id);
    setContentType('blog');
    navigate('/admin/editor/' + id);
  };

  const handleEditDoc = (id: number) => {
    setEditingPostId(id);
    setContentType('doc');
    navigate('/admin/editor/' + id);
  };

  const handleBack = () => {
    setEditingPostId(undefined);
    if (contentType === 'doc') {
      navigate('/admin/docs');
    } else {
      navigate('/admin/posts');
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const navLinks = [
    { to: '/', icon: <Home size={12} />, label: t('admin.home'), key: 'home' },
    { to: '/admin/posts', icon: <FileText size={12} />, label: t('admin.blogPosts'), key: 'posts' },
    { to: '/admin/docs', icon: <FolderOpen size={12} />, label: t('admin.projectDocs'), key: 'docs' },
    { to: '/admin/editor', icon: <PenLine size={12} />, label: t('admin.editor'), key: 'editor' },
    { to: '/admin/settings', icon: <Settings size={12} />, label: t('settings.title'), key: 'settings' },
    { to: '/admin/site-settings', icon: <Globe size={12} />, label: t('settings.siteSettings') || 'SITE_SETTINGS', key: 'site-settings' },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Top navigation bar */}
      <div className="h-12 border-b border-[var(--color-border-surface)] flex items-center justify-between px-3 md:px-4 bg-[var(--color-bg-secondary)] backdrop-blur-sm relative z-40">
        {/* Left: logo + desktop nav */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-xs font-mono text-[var(--color-text-muted)] hidden sm:inline">{t('admin.system')}</span>
          </div>

          <div className="w-px h-6 bg-[var(--color-border-surface)] hidden md:block" />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.key}
                to={link.to}
                onClick={link.key === 'editor' ? () => { setEditingPostId(undefined); setContentType('blog'); } : undefined}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded transition-all ${
                  activeTab === link.key
                    ? 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: desktop controls */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <UserIcon size={12} />
            <span className="font-mono">{user?.username || 'admin'}</span>
          </div>

          <div className="w-px h-4 bg-[var(--color-border-surface)]" />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2 py-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors text-xs font-mono"
            title={i18n.language === 'zh' ? 'Switch to English' : '切换到中文'}
          >
            <Globe size={14} />
            <span>{i18n.language === 'zh' ? 'EN' : '中'}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
            title={theme === 'dark' ? t('admin.switchToLight') : t('admin.switchToDark')}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="p-1.5 text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
          >
            <LogOut size={14} />
          </motion.button>
        </div>

        {/* Mobile: user + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <span className="text-xs font-mono text-[var(--color-text-muted)]">{user?.username || 'admin'}</span>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </motion.button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-[var(--color-border-surface)] bg-[var(--color-bg-secondary)] overflow-hidden z-30 relative"
          >
            <nav className="p-3 space-y-1">
              {navLinks.map(link => (
                <Link
                  key={link.key}
                  to={link.to}
                  onClick={() => {
                    if (link.key === 'editor') { setEditingPostId(undefined); setContentType('blog'); }
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2.5 text-sm font-mono rounded-lg transition-all ${
                    activeTab === link.key
                      ? 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card)]/50'
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}

              <div className="border-t border-[var(--color-border-surface)] my-2" />

              <div className="flex items-center gap-2 px-3 py-2">
                <button onClick={() => { toggleLanguage(); setMobileMenuOpen(false); }} className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-bg-card)]/50 transition-all">
                  <Globe size={14} />
                  {i18n.language === 'zh' ? 'EN' : '中'}
                </button>
                <button onClick={() => { toggleTheme(); setMobileMenuOpen(false); }} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-bg-card)]/50 transition-all">
                  {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                </button>
                <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="p-2 text-[var(--color-text-muted)] hover:text-red-400 rounded-lg hover:bg-[var(--color-bg-card)]/50 transition-all">
                  <LogOut size={14} />
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <Routes>
        <Route index element={<Dashboard onEditPost={handleEditPost} onNewPost={handleNewPost} />} />
        <Route path="posts" element={<Dashboard onEditPost={handleEditPost} onNewPost={handleNewPost} />} />
        <Route path="docs" element={<ProjectDocsDashboard onEditDoc={handleEditDoc} onNewDoc={handleNewDoc} />} />
        <Route path="editor" element={<ArticleEditor postId={editingPostId} onBack={handleBack} contentType={contentType} />} />
        <Route path="editor/:id" element={<ArticleEditor onBack={handleBack} contentType={contentType} />} />
        <Route path="settings" element={<SettingsPage forcePasswordChange={mustChangePassword} />} />
        <Route path="site-settings" element={<SiteSettingsPage />} />
      </Routes>
    </div>
  );
}