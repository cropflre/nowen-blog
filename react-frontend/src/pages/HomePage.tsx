import { useEffect, useState } from 'react';
import Hero from '../components/Hero';
import FeaturedPosts from '../components/FeaturedPosts';
import FeaturedProjects from '../components/FeaturedProjects';
import SectionDivider from '../components/SectionDivider';
import { api } from '../api';
import type { Post } from '../types';

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    api.getPosts({ pageSize: 3 }).then((res) => setPosts(res.data)).catch(console.error);
  }, []);

  return (
    <main className="relative z-10">
      <Hero />
      <SectionDivider />
      <FeaturedPosts posts={posts} />
      <SectionDivider />
      <FeaturedProjects projects={[]} />
    </main>
  );
}
