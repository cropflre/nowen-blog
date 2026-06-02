import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CommandPalette from './components/CommandPalette';
import CyberToast from './components/CyberToast';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import BlogPage from './pages/BlogPage';
import ArticleDetail from './pages/ArticleDetail';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDocs from './pages/ProjectDocs';
import GitHubDemoPage from './pages/GitHubDemoPage';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import './i18n/i18n'; // 初始化 i18n

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<ArticleDetail />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/docs/:project" element={<ProjectDocs />} />
          <Route path="/github-demo" element={<GitHubDemoPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

// Main app content with route detection
function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname === '/login';
  const isHomePage = location.pathname === '/';

  if (isAdminRoute) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {!isHomePage && <Navbar />}
      <div className="flex-1">
        <AnimatedRoutes />
      </div>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <CommandPalette />
          <CyberToast />
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
