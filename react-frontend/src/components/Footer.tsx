import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const useFooterLinks = () => {
  const { t } = useTranslation();
  return [
    { label: t('nav.home'), path: '/' },
    { label: t('nav.blog'), path: '/blog' },
    { label: t('nav.projects'), path: '/projects' },
  ];
};

const socialLinks = [
  {
    label: 'GitHub',
    href: 'https://github.com/cropflre',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
    ),
  },
  {
    label: 'Twitter',
    href: 'https://twitter.com/cropflre',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    label: 'Email',
    href: 'mailto:hello@cropflre.dev',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
];

export default function Footer() {
  const { t } = useTranslation();
  const footerLinks = useFooterLinks();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <footer ref={ref} className="relative py-16 px-6 bg-gray-900 dark:bg-gray-950 border-t border-gray-800 dark:border-gray-800">
      {/* Ambient glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-purple-600/10 blur-3xl rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="max-w-6xl mx-auto relative"
      >
        <div className="flex flex-wrap justify-center gap-12 mb-12">
          {/* Brand */}
          <div className="w-full md:w-[calc(33.333%-32px)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-400 flex items-center justify-center">
                <span className="text-white font-bold text-xs">N</span>
              </div>
              <span className="text-lg font-semibold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">nowen-blog</span>
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Navigation */}
          <div className="w-full md:w-[calc(33.333%-32px)]">
            <h4 className="text-sm font-semibold text-white dark:text-gray-200 mb-4 tracking-wider uppercase">{t('footer.navigation')}</h4>
            <div className="flex flex-col gap-3">
              {footerLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="text-sm text-gray-400 hover:text-purple-400 transition-colors duration-200 w-fit"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Social */}
          <div className="w-full md:w-[calc(33.333%-32px)]">
            <h4 className="text-sm font-semibold text-white dark:text-gray-200 mb-4 tracking-wider uppercase">{t('footer.connect')}</h4>
            <div className="flex gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-gray-800 dark:bg-gray-800 border border-gray-700 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-purple-400 hover:border-purple-500/30 hover:bg-gray-700 dark:hover:bg-gray-700 transition-all duration-300"
                  title={link.label}
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-gray-800 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500 dark:text-gray-600 font-mono">
            {t('footer.copyright')}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-600 font-mono flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            {t('footer.builtWith')}
          </p>
        </div>
      </motion.div>
    </footer>
  );
}
