import { useEffect, useState, useRef, forwardRef } from 'react';
import type { MouseEvent } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import type { Project } from '../types';

/* ── Mouse-tracking Glow Card ── */
const GlowCard = forwardRef<HTMLDivElement, { project: Project; index: number; large?: boolean }>(function GlowCard({ project, index, large }, ref) {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = ({ currentTarget, clientX, clientY }: MouseEvent) => {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  };

  const setRefs = (node: HTMLDivElement | null) => {
    (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  const spotlight = useTransform(
    [mouseX, mouseY],
    ([x, y]) => `radial-gradient(350px circle at ${x}px ${y}px, rgba(99,102,241,0.12), transparent 80%)`
  );

  const borderGlow = useTransform(
    [mouseX, mouseY],
    ([x, y]) => `radial-gradient(250px circle at ${x}px ${y}px, rgba(99,102,241,0.4), transparent 80%)`
  );

  return (
    <motion.div
      ref={setRefs}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
      onMouseMove={handleMouseMove}
      className={`group relative rounded-2xl overflow-hidden cursor-pointer flex-1 min-w-[300px] ${
        large ? 'md:min-w-[620px]' : ''
      }`}
    >
      {/* Border glow layer */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: borderGlow,
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          padding: '1px',
        }}
      />

      {/* Spotlight effect */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: spotlight }}
      />

      {/* Card content */}
      <div className={`relative h-full glass border border-[var(--color-border-surface)] rounded-2xl transition-colors duration-500 group-hover:border-indigo-500/20 ${
        large ? 'min-h-[480px]' : 'min-h-[320px]'
      }`}>
        {/* Background image with overlay */}
        <div className="absolute inset-0">
          <img
            src={project.image}
            alt={project.title}
            className="w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-700 group-hover:scale-105"
            style={{ transition: 'opacity 700ms, transform 700ms cubic-bezier(0.16, 1, 0.3, 1)' }}
            loading="lazy"
          />
          <div className="absolute inset-0 gradient-overlay-full" />
        </div>

        {/* Content */}
        <div className="relative z-20 h-full p-6 md:p-8 flex flex-col justify-end">
          {/* Featured badge */}
          {project.featured && (
            <div className="absolute top-5 right-5 flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500" />
              </span>
              <span className="text-xs font-mono text-indigo-400">{t('projects.featured')}</span>
            </div>
          )}

          {/* Category */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 w-fit mb-4">
            <span className="w-1 h-1 rounded-full bg-cyan-400" />
            {project.category}
          </span>

          {/* Title */}
          <h3 className={`font-bold text-[var(--color-text-primary)] mb-2 group-hover:text-cyan-300 transition-colors duration-300 ${
            large ? 'text-2xl md:text-3xl' : 'text-xl'
          }`}>
            {project.title}
          </h3>

          {/* Description */}
          <p className={`text-[var(--color-text-secondary)] leading-relaxed mb-5 ${
            large ? 'text-base max-w-lg' : 'text-sm line-clamp-2'
          }`}>
            {project.description}
          </p>

          {/* Tech stack */}
          <div className="flex flex-wrap gap-2 mb-5">
            {project.tech.map((t) => (
              <span
                key={t}
                className="px-2.5 py-1 rounded-lg text-xs font-mono bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border-surface)] group-hover:border-indigo-500/30 transition-colors"
              >
                {t}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border-surface)] hover:border-indigo-500/50 transition-all duration-300 hover:bg-[var(--color-bg-secondary)]"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                {t('projects.source')}
              </a>
            )}
            {project.link && (
              <a
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-cyan-600 hover:brightness-110 transition-all duration-300 shadow-lg shadow-indigo-500/20"
              >
                {t('projects.liveDemo')}
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

/* ── Stats Bar ── */
function StatsBar({ projects }: { projects: Project[] }) {
  const { t } = useTranslation();
  const stats = [
    { label: t('projects.stats.projects'), value: projects.length, icon: '◆' },
    { label: t('projects.stats.featured'), value: projects.filter(p => p.featured).length, icon: '★' },
    { label: t('projects.stats.categories'), value: new Set(projects.map(p => p.category)).size, icon: '◈' },
    { label: t('projects.stats.technologies'), value: new Set(projects.flatMap(p => p.tech)).size, icon: '⬡' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="flex flex-wrap justify-center gap-4 mb-12"
    >
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + i * 0.1 }}
          className="glass rounded-xl p-5 border border-[var(--color-border-surface)] text-center group hover:border-cyan-500/30 transition-colors duration-300 flex-1 min-w-[140px]"
        >
          <div className="text-xl mb-2 text-cyan-400">{stat.icon}</div>
          <div className="text-3xl font-bold gradient-text mb-1">{stat.value}</div>
          <div className="text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-wider">{stat.label}</div>
        </motion.div>
      ))}
    </motion.div>
  );
}

/* ── Main Page ── */
export default function ProjectsPage() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    api.getProjects().then((data) => {
      setProjects(data);
      const cats = [...new Set(data.map(p => p.category))];
      setCategories(cats);
    }).catch(() => {
      // Projects API not available yet - show empty state
      setProjects([]);
      setCategories([]);
    });
  }, []);

  const filtered = activeCategory
    ? projects.filter(p => p.category === activeCategory)
    : projects;

  return (
    <main className="relative pb-24 px-6 flex flex-col items-center" style={{ paddingTop: '200px', zIndex: 5 }}>
      <div className="w-full max-w-6xl" style={{ position: 'relative', zIndex: 5 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16 flex flex-col items-center text-center"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-cyan-500" />
            <span className="text-sm font-mono text-cyan-400 tracking-wider uppercase">{t('projects.sectionTitle')}</span>
            <div className="h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-cyan-500" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="gradient-text">{t('projects.heading')}</span>
          </h1>
          <p className="text-lg text-[var(--color-text-secondary)] max-w-xl leading-relaxed">
            {t('projects.description')}
          </p>
        </motion.div>

        {/* Stats */}
        <StatsBar projects={projects} />

        {/* Category filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          <button
            onClick={() => setActiveCategory('')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
              activeCategory === ''
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                : 'text-[var(--color-text-muted)] border border-[var(--color-border-surface)] hover:border-cyan-500/50 hover:text-[var(--color-text-primary)] hover:shadow-md'
            }`}
          >
            {t('projects.all')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat === activeCategory ? '' : cat)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                activeCategory === cat
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                  : 'text-[var(--color-text-muted)] border border-[var(--color-border-surface)] hover:border-cyan-500/50 hover:text-[var(--color-text-primary)] hover:shadow-md'
              }`}
            >
              {cat}
            </button>
          ))}
        </motion.div>

        {/* Bento Grid */}
        <div className="flex flex-wrap justify-center gap-5 w-full">
          <AnimatePresence mode="popLayout">
            {filtered.map((project, i) => (
              <GlowCard
                key={project.id}
                project={project}
                index={i}
                large={project.featured && i === 0}
              />
            ))}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 w-full"
          >
            <div className="w-16 h-16 rounded-full glass border border-[var(--color-border-surface)] flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-text-secondary)] mb-2">{t('projects.noProjects')}</h3>
            <p className="text-sm text-[var(--color-text-muted)]">{t('projects.noProjectsDesc')}</p>
          </motion.div>
        )}
      </div>
    </main>
  );
}
