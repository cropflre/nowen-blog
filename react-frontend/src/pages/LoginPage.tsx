import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sun, Moon, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRegister) {
        await register(username, email, password);
      } else {
        await login(username, password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : isRegister ? t('login.registerFailed') : t('login.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center px-4 font-mono relative">
      {/* Top right controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Link to="/" className="minimal-button h-9 min-h-9 w-9 p-0" aria-label={t('nav.home')}>
          <Home size={16} />
        </Link>
        <button type="button" onClick={toggleTheme} className="minimal-button h-9 min-h-9 w-9 p-0" aria-label={theme === 'dark' ? t('nav.switchToLight') : t('nav.switchToDark')}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

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
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2 tracking-wider">
            {isRegister ? t('login.registerTitle') : t('login.systemAccess')}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            <span className="text-[var(--color-text-muted)] opacity-60">
              {isRegister ? t('login.registerProtocol') : t('login.authProtocol')}
            </span>
          </p>
        </div>

        {/* Form */}
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
                {t('login.username')}
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                autoFocus
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200 bg-[var(--color-bg-primary)] border border-[var(--color-border-surface)] text-[var(--color-text-primary)] focus:border-[var(--color-accent)] placeholder-[var(--color-text-muted)]"
                placeholder="admin"
              />
            </div>

            {isRegister && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label htmlFor="email" className="block text-xs font-medium mb-2 text-[var(--color-text-muted)] tracking-wider">
                  {t('login.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200 bg-[var(--color-bg-primary)] border border-[var(--color-border-surface)] text-[var(--color-text-primary)] focus:border-[var(--color-accent)] placeholder-[var(--color-text-muted)]"
                  placeholder="user@example.com"
                />
              </motion.div>
            )}

            <div>
              <label htmlFor="password" className="block text-xs font-medium mb-2 text-[var(--color-text-muted)] tracking-wider">
                {t('login.password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200 bg-[var(--color-bg-primary)] border border-[var(--color-border-surface)] text-[var(--color-text-primary)] focus:border-[var(--color-accent)] placeholder-[var(--color-text-muted)]"
                placeholder="••••••••"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg text-sm font-mono font-semibold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--color-accent)] text-[var(--color-bg-primary)]"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full inline-block"
                  />
                  {isRegister ? t('login.registering') : t('login.authenticating')}
                </span>
              ) : (
                isRegister ? t('login.executeRegister') : t('login.executeLogin')
              )}
            </motion.button>
          </form>

          {/* Toggle login/register */}
          <div className="mt-6 pt-4 border-t border-[var(--color-border-surface)] text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-xs text-[var(--color-text-muted)] hover:text-emerald-400 transition-colors font-mono"
            >
              {isRegister ? t('login.switchToLogin') : t('login.switchToRegister')}
            </button>
          </div>
        </div>

        {/* Footer */}
        {!isRegister && (
          <div className="text-center mt-6 space-y-2">
            <p className="text-xs text-[var(--color-text-muted)] font-mono">
              <span className="opacity-60">{t('login.defaultCredentials')}</span>
            </p>
            <p className="text-xs text-[var(--color-text-muted)] opacity-50 font-mono">
              {t('login.protectedZone')}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}