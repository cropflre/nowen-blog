import { Link } from 'react-router-dom';
import { Seo } from '../components/seo/Seo';

export function NotFound() {
  return (
    <div className="mx-auto flex max-w-[760px] flex-col items-center px-4 py-24 text-center">
      <Seo title="页面不存在" />
      <p className="text-6xl font-bold text-brand">404</p>
      <p className="mt-4 text-muted">页面不存在。</p>
      <Link
        to="/"
        className="mt-8 rounded-lg bg-gradient-to-r from-brand to-brand-2 px-5 py-2.5 text-white"
      >
        返回首页
      </Link>
    </div>
  );
}
