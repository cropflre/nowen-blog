import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation, Routes, Route, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LogOut, Settings, User as UserIcon, Sun, Moon, Globe, FileText, FolderOpen, Home } from 'lucide-react';
import { Home } from 'lucide-react';
import Dashboard from './Dashboard';
import ProjectDocsDashboard from './ProjectDocsDashboard';
import ArticleEditor from './ArticleEditor';

export default function AdminPage() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [editingPostId, setEditingPostId] = useState<number | undefined>();
  const [contentType, setContentType] = useState<'blog' | 'doc'>('blog');

  // 根据当前路径判断激活的 tab
  const getActiveTab = () => {
    if (location.pathname.startsWith('/admin/docs')) return 'docs';
    if (location.pathname.startsWith('/admin/editor')) return 'editor';
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

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* 顶部导航栏 */}
      <div className="h-12 border-b border-[var(--color-border-surface)] flex items-center justify-between px-4 bg-[var(--color-bg-secondary)] backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-xs font-mono text-[var(--color-text-muted)]">{t('admin.system')}</span>
          </div>
          
          <div className="w-px h-6 bg-[var(--color-border-surface)]" />
          
          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded transition-all text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            >
              <Home size={12} />
              {t('admin.home')}
            </Link>
            <Link
              to="/admin/posts"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded transition-all ${
                activeTab === 'posts' 
                  ? 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)]' 
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              <FileText size={12} />
              {t('admin.blogPosts')}
            </Link>
            <Link
              to="/admin/docs"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded transition-all ${
                activeTab === 'docs' 
                  ? 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)]' 
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              <FolderOpen size={12} />
              {t('admin.projectDocs')}
            </Link>
            <Link
              to="/admin/editor"
              onClick={() => { setEditingPostId(undefined); setContentType('blog'); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded transition-all ${
                activeTab === 'editor'
                  ? 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)]' 
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              {t('admin.editor')}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <UserIcon size={12} />
            <span className="font-mono">{user?.username || 'admin'}</span>
          </div>
          
          <div className="w-px h-4 bg-[var(--color-border-surface)]" />
          
          {/* 语言切换按钮 */}
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

          {/* 主题切换按钮 */}
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
            className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            <Settings size={14} />
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
      </div>

      {/* 主内容区 - 使用路由 */}
      <Routes>
        <Route index element={<Dashboard onEditPost={handleEditPost} onNewPost={handleNewPost} />} />
        <Route path="posts" element={<Dashboard onEditPost={handleEditPost} onNewPost={handleNewPost} />} />
        <Route path="docs" element={<ProjectDocsDashboard onEditDoc={handleEditDoc} onNewDoc={handleNewDoc} />} />
        <Route path="editor" element={<ArticleEditor postId={editingPostId} onBack={handleBack} contentType={contentType} />} />
        <Route path="editor/:id" element={<ArticleEditor onBack={handleBack} contentType={contentType} />} />
      </Routes>
    </div>
  );
}



