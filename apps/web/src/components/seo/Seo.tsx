import { useEffect } from 'react';
import { setSeo } from '../../lib/seo';

export function Seo({
  title,
  description,
}: {
  title: string;
  description?: string | null;
}) {
  useEffect(() => {
    setSeo(title, description);
  }, [title, description]);
  return null;
}
