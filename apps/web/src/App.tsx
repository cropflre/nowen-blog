import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Posts } from './pages/Posts';
import { PostDetail } from './pages/PostDetail';
import { Categories } from './pages/Categories';
import { Tags } from './pages/Tags';
import { Archive } from './pages/Archive';
import { Search } from './pages/Search';
import { About } from './pages/About';
import { NotFound } from './pages/NotFound';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
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
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
