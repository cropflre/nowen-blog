import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { User as UserIcon, Lock, Save, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SettingsPageProps {
  forcePasswordChange?: boolean;
}

export default function SettingsPage({ forcePasswordChange }: SettingsPageProps) {
  const { t } = useTranslation();
  const { user, updatePassword, updateProfile, clearMustChangePassword } = useAuth();

  // Profile state
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');

  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdErr, setPwdErr] = useState('');

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email || '');
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErr('');
    setProfileMsg('');
    setProfileSaving(true);
    try {
      await updateProfile(username, email);
      setProfileMsg(t('settings.profileSaved'));
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : t('settings.profileSaveFailed'));
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdErr('');
    setPwdMsg('');

    if (newPassword !== confirmPassword) {
      setPwdErr(t('settings.passwordMismatch'));
      return;
    }
    if (newPassword.length < 6) {
      setPwdErr(t('settings.passwordTooShort'));
      return;
    }

    setPwdSaving(true);
    try {
      await updatePassword(oldPassword, newPassword);
      setPwdMsg(t('settings.passwordChanged'));
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (forcePasswordChange) {
        clearMustChangePassword();
      }
    } catch (err) {
      setPwdErr(err instanceof Error ? err.message : t('settings.passwordChangeFailed'));
    } finally {
      setPwdSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] p-4 md:p-8 font-mono">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-10 border-b border-[var(--color-border-surface)] pb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-wider mb-2">
            <span className="text-emerald-500">&gt;</span> {t('settings.title')}
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm">
            <span className="text-[var(--color-text-muted)]">//</span> {t('settings.description')}
          </p>
        </div>

        {forcePasswordChange && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-start gap-3"
          >
            <Shield size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">{t('settings.forceChangeTitle')}</p>
              <p className="text-amber-200/70">{t('settings.forceChangeDesc')}</p>
            </div>
          </motion.div>
        )}

        {/* Profile Section */}
        {!forcePasswordChange && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-10"
          >
            <div className="flex items-center gap-3 mb-6">
              <UserIcon size={18} className="text-emerald-500" />
              <h2 className="text-lg font-bold tracking-wider">{t('settings.profileSection')}</h2>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-5">
              {profileMsg && (
                <div className="p-3 rounded-lg text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {profileMsg}
                </div>
              )}
              {profileErr && (
                <div className="p-3 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/20">
                  <span className="text-red-500">ERROR:</span> {profileErr}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-2 text-[var(--color-text-muted)] tracking-wider">
                  {t('settings.usernameLabel')}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={50}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200 bg-[var(--color-bg-primary)] border border-[var(--color-border-surface)] text-[var(--color-text-primary)] focus:border-[var(--color-accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-2 text-[var(--color-text-muted)] tracking-wider">
                  {t('settings.emailLabel')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200 bg-[var(--color-bg-primary)] border border-[var(--color-border-surface)] text-[var(--color-text-primary)] focus:border-[var(--color-accent)]"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={profileSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-mono font-semibold tracking-wider transition-all duration-200 disabled:opacity-50 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
              >
                <Save size={14} />
                {profileSaving ? t('settings.saving') : t('settings.saveProfile')}
              </motion.button>
            </form>
          </motion.div>
        )}

        {/* Password Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: forcePasswordChange ? 0.1 : 0.2 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Lock size={18} className="text-emerald-500" />
            <h2 className="text-lg font-bold tracking-wider">{t('settings.passwordSection')}</h2>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            {pwdMsg && (
              <div className="p-3 rounded-lg text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {pwdMsg}
              </div>
            )}
            {pwdErr && (
              <div className="p-3 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/20">
                <span className="text-red-500">ERROR:</span> {pwdErr}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-2 text-[var(--color-text-muted)] tracking-wider">
                {t('settings.currentPassword')}
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200 bg-[var(--color-bg-primary)] border border-[var(--color-border-surface)] text-[var(--color-text-primary)] focus:border-[var(--color-accent)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2 text-[var(--color-text-muted)] tracking-wider">
                {t('settings.newPassword')}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200 bg-[var(--color-bg-primary)] border border-[var(--color-border-surface)] text-[var(--color-text-primary)] focus:border-[var(--color-accent)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2 text-[var(--color-text-muted)] tracking-wider">
                {t('settings.confirmPassword')}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200 bg-[var(--color-bg-primary)] border border-[var(--color-border-surface)] text-[var(--color-text-primary)] focus:border-[var(--color-accent)]"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={pwdSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-mono font-semibold tracking-wider transition-all duration-200 disabled:opacity-50 bg-[var(--color-accent)] text-[var(--color-bg-primary)]"
            >
              <Lock size={14} />
              {pwdSaving ? t('settings.saving') : t('settings.changePassword')}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}