import { useEffect, useState } from 'react';
import HeroRefactor from '../components/HeroRefactor';
import FeaturedPosts from '../components/FeaturedPosts';
import FeaturedProjects from '../components/FeaturedProjects';
import SectionDivider from '../components/SectionDivider';
import { api } from '../api';
import type { Post, Project } from '../types';

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    api.getPosts({ pageSize: 3 }).then((res) => setPosts(res.data)).catch(console.error);
    
    api.getProjects()
      .then((data) => {
        const featured = data.filter((p: Project) => p.featured).slice(0, 3);
        setProjects(featured.length > 0 ? featured : data.slice(0, 3));
      })
      .catch(console.error);
  }, []);

  return (
    <main className="relative z-10">
      <HeroRefactor />
      <SectionDivider />
      <FeaturedPosts posts={posts} />
      <SectionDivider />
      <FeaturedProjects projects={projects} />
    </main>
  );
}
