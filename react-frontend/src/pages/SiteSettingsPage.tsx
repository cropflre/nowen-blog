import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Save, Globe } from 'lucide-react';
import { api } from '../api';
import type { SiteInfo } from '../types';

export default function SiteSettingsPage() {
  const { t } = useTranslation();
  
  const [siteInfo, setSiteInfo] = useState<SiteInfo>({
    name: '',
    title: '',
    bio: '',
    avatar: '',
    email: '',
    github: '',
    twitter: '',
    skills: '',
    beian_enabled: false,
    beian_number: '',
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // 获取站点信息
  useEffect(() => {
    const fetchSiteInfo = async () => {
      try {
        const data = await api.getSite();
        setSiteInfo(data);
      } catch (error) {
        console.error('Failed to fetch site info:', error);
        setErr('Failed to load site information');
      } finally {
        setLoading(false);
      }
    };
    fetchSiteInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    setSaving(true);

    try {
      await api.updateSiteInfo(siteInfo);
      setMsg(t('settings.siteSaved') || 'Site information saved successfully');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to save site information');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof SiteInfo, value: string | boolean) => {
    setSiteInfo(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] p-4 md:p-8 font-mono flex items-center justify-center">
        <div className="text-[var(--color-text-muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] p-4 md:p-8 font-mono">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-10 border-b border-[var(--color-border-surface)] pb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-wider mb-2">
            <span className="text-emerald-500">&gt;</span> {t('settings.siteSettings') || 'SITE_SETTINGS'}
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm">
            <span className="text-[var(--color-text-muted)]">//</span> {t('settings.siteSettingsDesc') || 'Configure site information and settings'}
          </p>
        </div>

        {/* Messages */}
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-lg text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          >
            {msg}
          </motion.div>
        )}
        {err && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/20"
          >
            <span className="text-red-500">ERROR:</span> {err}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info Section */}
            <div className="flex items-center gap-3 mb-6">
              <Globe size={18} className="text-emerald-500" />
              <h2 className="text-lg font-bold tracking-wider">{t('settings.basicInfo') || 'BASIC_INFO'}</h2>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-medium mb-2 text-[var(--color-text-muted)] tracking-wider">
                {t('settings.siteName') || 'SITE_NAME'}
              </label>
              <input
                type="text"
                value={siteInfo.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200 bg-[var(--color-bg-primary)] border border-[var(--color-border-surface)] text-[var(--color-text-primary)] focus:border-[var(--color-accent)]"
              />
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-medium mb-2 text-[var(--color-text-muted)] tracking-wider">
                {t('settings.siteTitle') || 'SITE_TITLE'}
              </label>
              <input
                type="text"
                value={siteInfo.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200 bg-[var(--color-bg-primary)] border border-[var(--color-border-surface)] text-[var(--color-text-primary)] focus:border-[var(--color-accent)]"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-medium mb-2 text-[var(--color-text-muted)] tracking-wider">
                {t('settings.siteBio') || 'BIO'}
              </label>
              <textarea
                value={siteInfo.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200 bg-[var(--color-bg-primary)] border border-[var(--color-border-surface)] text-[var(--color-text-primary)] focus:border-[var(--color-accent)] resize-none"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium mb-2 text-[var(--color-text-muted)] tracking-wider">
                EMAIL
              </label>
              <input
                type="email"
                value={siteInfo.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200 bg-[var(--color-bg-primary)] border border-[var(--color-border-surface)] text-[var(--color-text-primary)] focus:border-[var(--color-accent)]"
              />
            </div>

            {/* GitHub */}
            <div>
              <label className="block text-xs font-medium mb-2 text-[var(--color-text-muted)] tracking-wider">
                GITHUB
              </label>
              <input
                type="url"
                value={siteInfo.github}
                onChange={(e) => handleChange('github', e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200 bg-[var(--color-bg-primary)] border border-[var(--color-border-surface)] text-[var(--color-text-primary)] focus:border-[var(--color-accent)]"
              />
            </div>

            {/* Twitter */}
            <div>
              <label className="block text-xs font-medium mb-2 text-[var(--color-text-muted)] tracking-wider">
                TWITTER
              </label>
              <input
                type="url"
                value={siteInfo.twitter}
                onChange={(e) => handleChange('twitter', e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200 bg-[var(--color-bg-primary)] border border-[var(--color-border-surface)] text-[var(--color-text-primary)] focus:border-[var(--color-accent)]"
              />
            </div>

            {/* Divider */}
            <div className="border-t border-[var(--color-border-surface)] pt-6 mt-8">
              <h2 className="text-lg font-bold tracking-wider mb-6">
                {t('settings.beianSettings') || 'BEIAN_SETTINGS'}
              </h2>
            </div>

            {/* Beian Enabled Switch */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--color-border-surface)]">
              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)]">
                  {t('settings.beianEnabled') || 'SHOW_BEIAN'}
                </label>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {t('settings.beianEnabledDesc') || 'Enable to display ICP beian number in footer'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleChange('beian_enabled', !siteInfo.beian_enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                  siteInfo.beian_enabled ? 'bg-emerald-500' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    siteInfo.beian_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Beian Number */}
            {siteInfo.beian_enabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-xs font-medium mb-2 text-[var(--color-text-muted)] tracking-wider">
                  {t('settings.beianNumber') || 'BEIAN_NUMBER'}
                </label>
                <input
                  type="text"
                  value={siteInfo.beian_number || ''}
                  onChange={(e) => handleChange('beian_number', e.target.value)}
                  placeholder={t('settings.beianNumberPlaceholder') || 'e.g. 京ICP备XXXXXXXX号'}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200 bg-[var(--color-bg-primary)] border border-[var(--color-border-surface)] text-[var(--color-text-primary)] focus:border-[var(--color-accent)]"
                />
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-mono font-semibold tracking-wider transition-all duration-200 disabled:opacity-50 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
            >
              <Save size={14} />
              {saving ? (t('settings.saving') || 'SAVING...') : (t('settings.saveSite') || 'SAVE_SITE')}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
