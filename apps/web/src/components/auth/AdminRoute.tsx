import { Navigate, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

/** 受保护后台路由：未登录访问 /admin 自动跳转 /admin/login */
export function AdminRoute() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'me'],
    queryFn: api.getMe,
    retry: false,
  });

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted">加载中…</div>;
  }
  if (!data) {
    return <Navigate to="/admin/login" replace />;
  }
  return <Outlet />;
}
