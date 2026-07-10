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
import { AdminPosts } from './pages/admin/AdminPosts';
import { AdminPostNew } from './pages/admin/AdminPostNew';
import { AdminPostEdit } from './pages/admin/AdminPostEdit';
import { AdminCategories } from './pages/admin/AdminCategories';
import { AdminTags } from './pages/admin/AdminTags';
import { AdminAssets } from './pages/admin/AdminAssets';
import { AdminComments } from './pages/admin/AdminComments';
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
            <Route path="/admin/posts" element={<AdminPosts />} />
            <Route path="/admin/posts/new" element={<AdminPostNew />} />
            <Route path="/admin/posts/:id/edit" element={<AdminPostEdit />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/tags" element={<AdminTags />} />
            <Route path="/admin/assets" element={<AdminAssets />} />
            <Route path="/admin/comments" element={<AdminComments />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
