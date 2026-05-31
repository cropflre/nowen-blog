import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { api } from '../api';
import type { Project } from '../types';

function GithubMark({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.79-.26.79-.58v-2.23c-3.34.73-4.03-1.42-4.03-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49.99.11-.77.42-1.3.76-1.6-2.66-.31-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23.96-.27 1.98-.4 3-.4s2.05.13 3 .4c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.19.69.8.58A12.01 12.01 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export default function ProjectsPage() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    api
      .getProjectsList()
      .then((data) => {
        const mapped: Project[] = data.map((p, i) => ({
          id: i + 1,
          title: p.project_name,
          description: `${p.doc_count} docs`,
          image: '',
          category: 'project',
          tech: [],
          github: p.github_url || undefined,
        }));
        setProjects(mapped);
        setCategories([...new Set(mapped.map((project) => project.category))]);
      })
      .catch(() => {
        setProjects([]);
        setCategories([]);
      });
  }, []);

  const filtered = activeCategory ? projects.filter((project) => project.category === activeCategory) : projects;

  return (
    <main className="pt-32 pb-24">
      <div className="page-shell">
        <header className="mb-12 max-w-3xl">
          <span className="minimal-kicker">{t('projects.sectionTitle')}</span>
          <h1 className="minimal-title">{t('projects.heading')}</h1>
          <p className="minimal-text mt-6 text-lg">{t('projects.description')}</p>
        </header>

        <div className="mb-10 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory('')}
            className={activeCategory === '' ? 'minimal-button-primary' : 'minimal-button'}
          >
            {t('projects.all')}
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category === activeCategory ? '' : category)}
              className={activeCategory === category ? 'minimal-button-primary' : 'minimal-button'}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project, index) => (
            <motion.article
              key={project.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.04 }}
              className="minimal-card flex min-h-80 flex-col rounded-2xl p-5"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <span className="minimal-tag">{project.category}</span>
                {project.featured && <span className="text-xs text-[var(--color-text-muted)]">{t('projects.featured')}</span>}
              </div>
              <h2 className="text-2xl font-semibold leading-tight">{project.title}</h2>
              <p className="minimal-text mt-3 line-clamp-3 text-sm">{project.description}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {project.tech.map((tech) => (
                  <span key={tech} className="minimal-tag">
                    {tech}
                  </span>
                ))}
              </div>
              <div className="mt-auto flex flex-wrap gap-3 pt-8">
                {project.github && (
                  <a href={project.github} target="_blank" rel="noopener noreferrer" className="minimal-button">
                    <GithubMark />
                    {t('projects.source')}
                  </a>
                )}
                {project.link && (
                  <a href={project.link} target="_blank" rel="noopener noreferrer" className="minimal-button-primary">
                    {t('projects.liveDemo')}
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </motion.article>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="minimal-card rounded-2xl py-20 text-center">
            <h3 className="text-lg font-semibold">{t('projects.noProjects')}</h3>
            <p className="minimal-text mx-auto mt-2 max-w-md text-sm">{t('projects.noProjectsDesc')}</p>
          </div>
        )}
      </div>
    </main>
  );
}

