import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';

function TypewriterText() {
  const { t } = useTranslation();
  const roles = [
    t('hero.roles.fullStack'),
    t('hero.roles.architect'),
    t('hero.roles.creator'),
    t('hero.roles.goEnthusiast'),
  ];
  const [roleIndex, setRoleIndex] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = roles[roleIndex];
    let timer: ReturnType<typeof setTimeout>;

    if (!deleting && text === current) {
      timer = setTimeout(() => setDeleting(true), 2000);
    } else if (deleting && text === '') {
      setDeleting(false);
      setRoleIndex((prev) => (prev + 1) % roles.length);
    } else {
      timer = setTimeout(
        () => {
          setText(
            deleting ? current.slice(0, text.length - 1) : current.slice(0, text.length + 1)
          );
        },
        deleting ? 40 : 80
      );
    }

    return () => clearTimeout(timer);
  }, [text, deleting, roleIndex]);

  return (
    <span className="text-cyan-400">
      {text}
      <span className="animate-pulse text-indigo-400">|</span>
    </span>
  );
}

function GlowOrb({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <motion.div
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.3, 0.6, 0.3],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        delay,
        ease: 'easeInOut',
      }}
      className={`absolute rounded-full blur-3xl ${className}`}
    />
  );
}

export default function Hero() {
  const { t } = useTranslation();
  const skills = [
    t('hero.skills.go'),
    t('hero.skills.react'),
    t('hero.skills.typescript'),
    t('hero.skills.docker'),
    t('hero.skills.postgresql'),
    t('hero.skills.grpc'),
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Ambient orbs */}
      <GlowOrb className="w-96 h-96 bg-indigo-600/20 -top-20 -left-20" delay={0} />
      <GlowOrb className="w-80 h-80 bg-cyan-500/15 top-1/3 right-10" delay={1.5} />
      <GlowOrb className="w-64 h-64 bg-purple-600/10 bottom-20 left-1/4" delay={3} />

      {/* Hex grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='70' viewBox='0 0 60 70' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill='none' stroke='%236366f1' stroke-width='0.5'/%3E%3C/svg%3E")`,
      }} />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Status badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-sm text-[var(--color-text-secondary)]">{t('hero.status')}</span>
        </motion.div>

        {/* Avatar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 flex justify-center"
        >
          <div className="relative">
            <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 p-[2px] rotate-3 hover:rotate-0 transition-transform duration-500">
              <div className="w-full h-full rounded-2xl bg-[var(--color-bg-secondary)] flex items-center justify-center overflow-hidden">
                <img
                  src="https://api.dicebear.com/7.x/bottts-neutral/svg?seed=cropflre&backgroundColor=0a0a0a"
                  alt="avatar"
                  className="w-20 h-20"
                />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-4 border-[var(--color-bg-primary)]" />
          </div>
        </motion.div>

        {/* Name */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl md:text-7xl font-bold mb-4 tracking-tight"
        >
          <span className="gradient-text">{t('hero.name')}</span>
        </motion.h1>

        {/* Typewriter subtitle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-xl md:text-2xl font-mono mb-6 h-8"
        >
          <TypewriterText />
        </motion.div>

        {/* Bio */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-base md:text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          <Trans i18nKey="hero.bio">
            Building high-performance systems with <span className="text-cyan-400 font-medium">Go</span> and
            elegant interfaces with <span className="text-indigo-400 font-medium">React</span>.
            Passionate about distributed systems, developer tools, and open-source software.
          </Trans>
        </motion.p>

        {/* Skills tags */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {skills.map((skill, i) => (
            <motion.span
              key={skill}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.1 + i * 0.08 }}
              whileHover={{ scale: 1.08, y: -2 }}
              className="px-4 py-1.5 rounded-full text-sm font-mono glass glass-hover cursor-default
                         text-[var(--color-text-secondary)] border border-[var(--color-border-surface)] hover:border-indigo-500/40
                         transition-all duration-300 hover:text-indigo-300"
            >
              {skill}
            </motion.span>
          ))}
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            to="/projects"
            className="group relative px-8 py-3.5 rounded-xl overflow-hidden font-medium text-white"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-cyan-600 transition-all duration-300 group-hover:brightness-110" />
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-cyan-600 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
            <span className="relative flex items-center gap-2">
              {t('hero.cta.viewProjects')}
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </Link>

          <Link
            to="/blog"
            className="px-8 py-3.5 rounded-xl font-medium text-[var(--color-text-secondary)] border border-[var(--color-border-surface)]
                       hover:border-indigo-500/50 hover:text-[var(--color-text-primary)] transition-all duration-300
                       hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]"
          >
            {t('hero.cta.readBlog')}
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-6 h-10 rounded-full border-2 border-[var(--color-border-surface)] flex justify-center pt-2"
        >
          <div className="w-1 h-2 rounded-full bg-indigo-400" />
        </motion.div>
      </motion.div>
    </section>
  );
}
