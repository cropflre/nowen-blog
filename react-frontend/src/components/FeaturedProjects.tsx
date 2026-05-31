import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Project } from '../types';

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="group"
    >
      <div className="relative h-full rounded-2xl overflow-hidden glass glass-hover transition-all duration-500 flex flex-col">
        {/* Featured badge */}
        {project.featured && (
          <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-600 text-xs font-medium text-white">
            {t('featuredProjects.featured')}
          </div>
        )}

        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={project.image}
            alt={project.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 gradient-overlay-dark" />

          {/* Category */}
          <div className="absolute bottom-3 left-4 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm text-xs font-mono text-cyan-400 border border-cyan-500/20">
            {project.category}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col">
          <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent group-hover:from-purple-300 group-hover:to-indigo-300 transition-all duration-300">
            {project.title}
          </h3>

          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-4 flex-1 line-clamp-3">
            {project.description}
          </p>

          {/* Tech stack */}
          <div className="flex flex-wrap gap-2 mb-5">
            {project.tech.map((t) => (
              <span
                key={t}
                className="px-2.5 py-1 rounded-lg text-xs font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors duration-200"
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
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border-surface)] hover:border-indigo-500/50 transition-all duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                {t('featuredProjects.source')}
              </a>
            )}
            {project.link && (
              <a
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-cyan-600 hover:brightness-110 transition-all duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                {t('featuredProjects.liveDemo')}
              </a>
            )}
          </div>
        </div>

        {/* Hover border glow */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
             style={{ boxShadow: '0 0 40px rgba(139,92,246,0.15), inset 0 0 40px rgba(139,92,246,0.08)' }} />
      </div>
    </motion.div>
  );
}

export default function FeaturedProjects({ projects }: { projects: Project[] }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent to-cyan-500" />
            <span className="text-sm font-mono text-cyan-400 tracking-wider uppercase">{t('featuredProjects.sectionTitle')}</span>
            <div className="h-px flex-1 max-w-[60px] bg-gradient-to-l from-transparent to-cyan-500" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold">
            <span className="gradient-text">{t('featuredProjects.heading')}</span>
          </h2>
        </motion.div>

        {/* Flex container */}
        <div className="flex flex-wrap justify-center gap-6">
          {projects.map((project, i) => (
            <div key={project.id} className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
              <ProjectCard project={project} index={i} />
            </div>
          ))}
        </div>

        {/* View all */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center"
        >
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-white border border-slate-700 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(34,211,238,0.15)]"
          >
            {t('featuredProjects.viewAll')}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
