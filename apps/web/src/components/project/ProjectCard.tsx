import { ArrowUpRight, ExternalLink, Github, GitFork, Star } from 'lucide-react';
import type { Project } from '@blog/shared';
import { cn } from '../../lib/cn';

export type ProjectCardVariant = 'default' | 'home-primary' | 'home-compact';

export function ProjectCard({
  project,
  compact = false,
  variant = 'default',
}: {
  project: Project;
  compact?: boolean;
  variant?: ProjectCardVariant;
}) {
  const primaryUrl = project.homepageUrl || project.repositoryUrl;
  const isHome = variant !== 'default';
  const isPrimary = variant === 'home-primary';
  const isCompact = compact || variant === 'home-compact';
  const topicLimit = isPrimary ? 6 : isCompact ? 3 : 6;

  return (
    <article
      className={cn(
        'group flex h-full flex-col overflow-hidden',
        isHome
          ? 'nowen-card'
          : 'rounded-card border border-line bg-surface transition hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-xl hover:shadow-brand/5',
        isPrimary && 'min-h-[28rem]',
        variant === 'home-compact' && 'min-h-[13.5rem]',
      )}
    >
      {!isCompact && (project.coverUrl ? (
        <a
          href={primaryUrl ?? undefined}
          target={primaryUrl ? '_blank' : undefined}
          rel="noreferrer noopener"
          className="nowen-focus block aspect-[16/8] overflow-hidden border-b border-[var(--color-border-light)] bg-[var(--color-bg-tertiary)]"
        >
          <img
            src={project.coverUrl}
            alt={project.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.035]"
          />
        </a>
      ) : (
        <div className="relative aspect-[16/8] overflow-hidden border-b border-[var(--color-border-light)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-primary)_20%,var(--color-bg-tertiary)),color-mix(in_srgb,var(--color-accent)_12%,var(--color-bg-primary)))]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,color-mix(in_srgb,var(--color-text-primary)_15%,transparent),transparent_38%)]" />
          <div className="absolute bottom-5 left-6 right-6 flex items-end justify-between gap-4">
            <span className="font-mono text-3xl font-semibold tracking-[-0.06em] text-[var(--color-text-primary)]">
              {project.name.slice(0, 2).toUpperCase()}
            </span>
            {project.language && <span className="nowen-tag px-2.5 py-1">{project.language}</span>}
          </div>
        </div>
      ))}

      <div className={cn('flex flex-1 flex-col', isPrimary ? 'p-6' : isCompact ? 'p-5' : 'p-5')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3
                className={cn(
                  'truncate font-semibold tracking-[-0.02em] text-[var(--color-text-primary)] transition group-hover:text-[var(--color-primary)]',
                  isPrimary ? 'text-xl md:text-2xl' : 'text-lg',
                )}
                title={project.name}
              >
                {project.name}
              </h3>
              {isHome && <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--color-primary)]" />}
            </div>
            {project.githubFullName && <p className="mt-1 truncate font-mono text-[11px] text-[var(--color-text-muted)]">{project.githubFullName}</p>}
          </div>
          {project.isFeatured && <span className="nowen-tag shrink-0 px-2 py-1 text-[var(--color-primary)]">精选</span>}
        </div>

        <p className={cn('mt-3 text-sm leading-6 text-[var(--color-text-secondary)]', isCompact ? 'line-clamp-2' : 'line-clamp-3')}>
          {project.description || '一个持续打磨中的项目。'}
        </p>

        {project.topics.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.topics.slice(0, topicLimit).map((topic) => (
              <span key={topic} className="nowen-tag truncate px-2 py-1" title={topic}>{topic}</span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-xs text-[var(--color-text-muted)]">
          <div className="flex items-center gap-3 font-mono tabular-nums">
            {project.source === 'github' && (
              <>
                <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5" />{project.stars}</span>
                <span className="inline-flex items-center gap-1"><GitFork className="h-3.5 w-3.5" />{project.forks}</span>
              </>
            )}
            {!isPrimary && project.language && <span className="truncate">{project.language}</span>}
          </div>
          <div className="flex items-center gap-2">
            {project.repositoryUrl && (
              <a
                href={project.repositoryUrl}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`${project.name} GitHub`}
                className="nowen-icon-button nowen-focus inline-flex h-11 w-11 items-center justify-center"
              >
                <Github className="h-4 w-4" />
              </a>
            )}
            {project.homepageUrl && (
              <a
                href={project.homepageUrl}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`访问 ${project.name}`}
                className="nowen-icon-button nowen-focus inline-flex h-11 w-11 items-center justify-center"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
