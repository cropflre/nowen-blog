import { ExternalLink, Github, GitFork, Star } from 'lucide-react';
import type { Project } from '@blog/shared';

export function ProjectCard({ project, compact = false }: { project: Project; compact?: boolean }) {
  const primaryUrl = project.homepageUrl || project.repositoryUrl;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface transition hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-xl hover:shadow-brand/5">
      {project.coverUrl ? (
        <a href={primaryUrl ?? undefined} target={primaryUrl ? '_blank' : undefined} rel="noreferrer noopener" className="block aspect-[16/9] overflow-hidden border-b border-line bg-bg">
          <img src={project.coverUrl} alt={project.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        </a>
      ) : (
        <div className="relative aspect-[16/9] overflow-hidden border-b border-line bg-gradient-to-br from-brand/20 via-brand-2/10 to-bg">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.18),transparent_38%)]" />
          <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-4">
            <span className="text-3xl font-black tracking-tight text-fg/90">{project.name.slice(0, 2).toUpperCase()}</span>
            {project.language && <span className="rounded-full border border-white/15 bg-black/10 px-2.5 py-1 text-xs backdrop-blur">{project.language}</span>}
          </div>
        </div>
      )}

      <div className={`flex flex-1 flex-col ${compact ? 'p-4' : 'p-5'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-fg transition group-hover:text-brand">{project.name}</h3>
            {project.githubFullName && <p className="mt-1 truncate text-xs text-muted">{project.githubFullName}</p>}
          </div>
          {project.isFeatured && <span className="shrink-0 rounded-full bg-brand/10 px-2 py-1 text-[11px] font-medium text-brand">精选</span>}
        </div>

        <p className={`mt-3 text-sm leading-6 text-muted ${compact ? 'line-clamp-2' : 'line-clamp-3'}`}>
          {project.description || '一个持续打磨中的项目。'}
        </p>

        {project.topics.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.topics.slice(0, compact ? 4 : 6).map((topic) => (
              <span key={topic} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">{topic}</span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-xs text-muted">
          <div className="flex items-center gap-3">
            {project.source === 'github' && (
              <>
                <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5" />{project.stars}</span>
                <span className="inline-flex items-center gap-1"><GitFork className="h-3.5 w-3.5" />{project.forks}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {project.repositoryUrl && (
              <a href={project.repositoryUrl} target="_blank" rel="noreferrer noopener" aria-label={`${project.name} GitHub`} className="rounded-lg border border-line p-2 transition hover:border-brand/50 hover:text-fg">
                <Github className="h-4 w-4" />
              </a>
            )}
            {project.homepageUrl && (
              <a href={project.homepageUrl} target="_blank" rel="noreferrer noopener" aria-label={`访问 ${project.name}`} className="rounded-lg border border-line p-2 transition hover:border-brand/50 hover:text-fg">
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
