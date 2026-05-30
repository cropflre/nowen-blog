import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Settings, User as UserIcon } from 'lucide-react';
import Dashboard from './Dashboard';
import ArticleEditor from './ArticleEditor';

export default function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const [editingPostId, setEditingPostId] = useState<number | undefined>();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNewPost = () => {
    setEditingPostId(undefined);
    setView('editor');
  };

  const handleEditPost = (id: number) => {
    setEditingPostId(id);
    setView('editor');
  };

  const handleBack = () => {
    setView('dashboard');
    setEditingPostId(undefined);
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* 顶部导航栏 */}
      <div className="h-12 border-b border-zinc-800/50 flex items-center justify-between px-4 bg-zinc-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-xs font-mono text-zinc-400">SYSTEM</span>
          </div>
          
          <div className="w-px h-6 bg-zinc-800" />
          
          <nav className="flex items-center gap-1">
            <button
              onClick={() => setView('dashboard')}
              className={`px-3 py-1.5 text-xs font-mono rounded transition-all ${
                view === 'dashboard' 
                  ? 'bg-zinc-800 text-white' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              DASHBOARD
            </button>
            <button
              onClick={handleNewPost}
              className={`px-3 py-1.5 text-xs font-mono rounded transition-all ${
                view === 'editor' 
                  ? 'bg-zinc-800 text-white' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              EDITOR
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <UserIcon size={12} />
            <span className="font-mono">{user?.username || 'admin'}</span>
          </div>
          
          <div className="w-px h-4 bg-zinc-800" />
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Settings size={14} />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
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
        ) : (
          <motion.div
            key="editor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ArticleEditor postId={editingPostId} onBack={handleBack} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
