import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ExternalLink } from 'lucide-react';
import type { Project } from '../types';

function GithubMark({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.79-.26.79-.58v-2.23c-3.34.73-4.03-1.42-4.03-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49.99.11-.77.42-1.3.76-1.6-2.66-.31-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23.96-.27 1.98-.4 3-.4s2.05.13 3 .4c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.19.69.8.58A12.01 12.01 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export default function FeaturedProjects({ projects }: { projects: Project[] }) {
  const { t } = useTranslation();

  return (
    <section className="py-20 md:py-24">
      <div className="page-shell">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <span className="minimal-kicker">{t('featuredProjects.sectionTitle')}</span>
            <h2 className="minimal-section-title">{t('featuredProjects.heading')}</h2>
          </div>
          {projects.length > 0 && (
            <Link to="/projects" className="minimal-button hidden sm:inline-flex">
              {t('featuredProjects.viewAll')}
              <ArrowRight size={15} />
            </Link>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="minimal-card rounded-2xl p-7 md:flex md:items-center md:justify-between md:gap-8">
            <div>
              <h3 className="text-xl font-semibold">{t('featuredProjects.noProjects')}</h3>
              <p className="minimal-text mt-2 max-w-xl text-sm">{t('featuredProjects.noProjectsDesc')}</p>
            </div>
            <Link to="/projects" className="minimal-button-primary mt-6 md:mt-0">
              {t('featuredProjects.viewAll')}
              <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {projects.map((project) => (
              <article key={project.id} className="minimal-card flex min-h-72 flex-col rounded-2xl p-5">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <span className="minimal-tag">{project.category}</span>
                  {project.featured && <span className="text-xs text-[var(--color-text-muted)]">{t('featuredProjects.featured')}</span>}
                </div>
                <h3 className="text-xl font-semibold leading-tight">{project.title}</h3>
                <p className="minimal-text mt-3 line-clamp-3 text-sm">{project.description}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {project.tech.slice(0, 5).map((tech) => (
                    <span key={tech} className="minimal-tag">
                      {tech}
                    </span>
                  ))}
                </div>
                <div className="mt-auto flex flex-wrap gap-3 pt-8">
                  {project.github && (
                    <a href={project.github} target="_blank" rel="noopener noreferrer" className="minimal-button">
                      <GithubMark />
                      {t('featuredProjects.source')}
                    </a>
                  )}
                  {project.link && (
                    <a href={project.link} target="_blank" rel="noopener noreferrer" className="minimal-button-primary">
                      {t('featuredProjects.liveDemo')}
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
