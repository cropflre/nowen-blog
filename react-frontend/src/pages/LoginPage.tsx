import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4 font-mono">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4 bg-[var(--color-bg-card)] border border-[var(--color-border-surface)]">
            <span className="text-2xl font-bold text-emerald-500">&gt;_</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2 tracking-wider">SYSTEM_ACCESS</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            <span className="text-[var(--color-text-muted)] opacity-60">//</span> 身份验证协议启动中...
          </p>
        </div>

        {/* Login Form */}
        <div className="rounded-xl p-8 bg-[var(--color-bg-card)] border border-[var(--color-border-surface)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg text-sm font-mono bg-red-500/10 text-red-400 border border-red-500/20"
              >
                <span className="text-red-500">ERROR:</span> {error}
              </motion.div>
            )}

            <div>
              <label htmlFor="username" className="block text-xs font-medium mb-2 text-[var(--color-text-muted)] tracking-wider">
                USERNAME
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                autoFocus
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200 bg-[var(--color-bg-primary)] border border-[var(--color-border-surface)] text-[var(--color-text-secondary)] focus:border-[var(--color-accent)] placeholder-[var(--color-text-muted)]"
                placeholder="admin"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium mb-2 text-[var(--color-text-muted)] tracking-wider">
                PASSWORD
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200 bg-[var(--color-bg-primary)] border border-[var(--color-border-surface)] text-[var(--color-text-secondary)] focus:border-[var(--color-accent)] placeholder-[var(--color-text-muted)]"
                placeholder="••••••••"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.01, boxShadow: "0 0 20px rgba(16, 185, 129, 0.15)" }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg text-sm font-mono font-semibold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full inline-block"
                  />
                  AUTHENTICATING...
                </span>
              ) : (
                'EXECUTE_LOGIN'
              )}
            </motion.button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-xs text-[var(--color-text-muted)] font-mono">
            <span className="opacity-60">DEFAULT:</span> admin / admin123
          </p>
          <p className="text-xs text-[var(--color-text-muted)] opacity-50 font-mono">
            PROTECTED_ZONE // UNAUTHORIZED_ACCESS_PROHIBITED
          </p>
        </div>
      </motion.div>
    </div>
  );
}
