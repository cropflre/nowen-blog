import { useEffect, useState } from 'react';
import HeroRefactor from '../components/HeroRefactor';
import FeaturedPosts from '../components/FeaturedPosts';
import FeaturedProjects from '../components/FeaturedProjects';
import { api } from '../api';
import type { Post, Project } from '../types';

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    api.getPosts({ pageSize: 3 }).then((res) => setPosts(res.data)).catch(console.error);
    
    api.getProjectsList()
      .then((data) => {
        const mapped: Project[] = data.slice(0, 3).map((p, i) => ({
          id: i + 1,
          title: p.project_name,
          description: `${p.doc_count} docs`,
          image: '',
          category: 'project',
          tech: [],
          github: p.github_url || undefined,
        }));
        setProjects(mapped);
      })
      .catch(console.error);
  }, []);

  return (
    <main className="relative z-10">
      <HeroRefactor />
      <FeaturedPosts posts={posts} />
      <FeaturedProjects projects={projects} />
    </main>
  );
}
