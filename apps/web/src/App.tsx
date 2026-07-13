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
import { Projects } from './pages/Projects';
import { DocsHome } from './pages/docs/DocsHome';
import { DocPage } from './pages/docs/DocPage';
import { Unsubscribe } from './pages/Unsubscribe';
import { Login } from './pages/admin/Login';
import { Dashboard } from './pages/admin/Dashboard';
import { AdminPosts } from './pages/admin/AdminPosts';
import { AdminPostNew } from './pages/admin/AdminPostNew';
import { AdminPostEdit } from './pages/admin/AdminPostEdit';
import { AdminDocs } from './pages/admin/AdminDocs';
import { AdminCategories } from './pages/admin/AdminCategories';
import { AdminTags } from './pages/admin/AdminTags';
import { AdminAssets } from './pages/admin/AdminAssets';
import { AdminComments } from './pages/admin/AdminComments';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminProjects } from './pages/admin/AdminProjects';
import { AdminNewsletter } from './pages/admin/AdminNewsletter';
import { AdminAISettings } from './pages/admin/AdminAISettings';
import { NotFound } from './pages/NotFound';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/docs" element={<DocsHome />} />
          <Route path="/docs/:spaceSlug" element={<DocPage />} />
          <Route path="/docs/:spaceSlug/:version/*" element={<DocPage />} />
          <Route path="/blog" element={<Posts />} />
          <Route path="/blog/:slug" element={<PostDetail />} />
          <Route path="/posts" element={<Posts />} />
          <Route path="/posts/:slug" element={<PostDetail />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/categories/:slug" element={<Posts taxonomy="category" />} />
          <Route path="/tags" element={<Tags />} />
          <Route path="/tags/:slug" element={<Posts taxonomy="tag" />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/search" element={<Search />} />
          <Route path="/about" element={<About />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
        </Route>

        <Route element={<LoginRoute />}>
          <Route path="/admin/login" element={<Login />} />
        </Route>
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/posts" element={<AdminPosts />} />
            <Route path="/admin/posts/new" element={<AdminPostNew />} />
            <Route path="/admin/posts/:id/edit" element={<AdminPostEdit />} />
            <Route path="/admin/docs" element={<AdminDocs />} />
            <Route path="/admin/ai" element={<AdminAISettings />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/tags" element={<AdminTags />} />
            <Route path="/admin/projects" element={<AdminProjects />} />
            <Route path="/admin/assets" element={<AdminAssets />} />
            <Route path="/admin/comments" element={<AdminComments />} />
            <Route path="/admin/newsletter" element={<AdminNewsletter />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
