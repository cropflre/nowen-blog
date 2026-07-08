import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { AdminLayout } from './components/layout/AdminLayout';
import { AdminRoute } from './components/auth/AdminRoute';
import { LoginRoute } from './components/auth/LoginRoute';
import { Home } from './pages/Home';
import { Posts } from './pages/Posts';
import { PostDetail } from './pages/PostDetail';
import { Categories } from './pages/Categories';
import { Tags } from './pages/Tags';
import { Archive } from './pages/Archive';
import { Search } from './pages/Search';
import { About } from './pages/About';
import { Login } from './pages/admin/Login';
import { Dashboard } from './pages/admin/Dashboard';
import { NotFound } from './pages/NotFound';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 前台 */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/posts" element={<Posts />} />
          <Route path="/posts/:slug" element={<PostDetail />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/categories/:slug" element={<Posts taxonomy="category" />} />
          <Route path="/tags" element={<Tags />} />
          <Route path="/tags/:slug" element={<Posts taxonomy="tag" />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/search" element={<Search />} />
          <Route path="/about" element={<About />} />
        </Route>

        {/* 后台：独立布局，不经过前台 Layout */}
        <Route element={<LoginRoute />}>
          <Route path="/admin/login" element={<Login />} />
        </Route>
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<Dashboard />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
