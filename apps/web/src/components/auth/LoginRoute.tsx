import { Navigate, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

/** 登录页路由：已登录访问 /admin/login 自动跳转 /admin */
export function LoginRoute() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'me'],
    queryFn: api.getMe,
    retry: false,
  });

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted">加载中…</div>;
  }
  if (data) {
    return <Navigate to="/admin" replace />;
  }
  return <Outlet />;
}
