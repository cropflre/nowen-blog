import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LogOut, Settings, User as UserIcon, Sun, Moon, Globe, FileText, FolderOpen } from 'lucide-react';
import Dashboard from './Dashboard';
import ProjectDocsDashboard from './ProjectDocsDashboard';
import ArticleEditor from './ArticleEditor';

type ViewType = 'dashboard' | 'projects' | 'editor';

export default function AdminPage() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [view, setView] = useState<ViewType>('dashboard');
  const [editingPostId, setEditingPostId] = useState<number | undefined>();
  const [contentType, setContentType] = useState<'blog' | 'doc'>('blog');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNewPost = () => {
    setEditingPostId(undefined);
    setContentType('blog');
    setView('editor');
  };

  const handleNewDoc = () => {
    setEditingPostId(undefined);
    setContentType('doc');
    setView('editor');
  };

  const handleEditPost = (id: number) => {
    setEditingPostId(id);
    setContentType('blog');
    setView('editor');
  };

  const handleEditDoc = (id: number) => {
    setEditingPostId(id);
    setContentType('doc');
    setView('editor');
  };

  const handleBack = () => {
    if (contentType === 'doc') {
      setView('projects');
    } else {
      setView('dashboard');
    }
    setEditingPostId(undefined);
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
            <button
              onClick={() => { setView('dashboard'); setEditingPostId(undefined); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded transition-all ${
                view === 'dashboard' 
                  ? 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)]' 
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              <FileText size={12} />
              {t('admin.blogPosts')}
            </button>
            <button
              onClick={() => { setView('projects'); setEditingPostId(undefined); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded transition-all ${
                view === 'projects' 
                  ? 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)]' 
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              <FolderOpen size={12} />
              {t('admin.projectDocs')}
            </button>
            <button
              onClick={handleNewPost}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded transition-all ${
                view === 'editor' && contentType === 'blog'
                  ? 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)]' 
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              {t('admin.editor')}
            </button>
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

      {/* 主内容区 */}
      <AnimatePresence mode="wait">
        {view === 'dashboard' ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Dashboard onEditPost={handleEditPost} onNewPost={handleNewPost} />
          </motion.div>
        ) : view === 'projects' ? (
          <motion.div
            key="projects"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ProjectDocsDashboard onEditDoc={handleEditDoc} onNewDoc={handleNewDoc} />
          </motion.div>
        ) : (
          <motion.div
            key="editor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ArticleEditor 
              postId={editingPostId} 
              onBack={handleBack}
              contentType={contentType}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
