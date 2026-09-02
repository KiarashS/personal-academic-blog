import { useEffect } from 'react';
import { siteConfig } from '../site.config';

function setMeta(name: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.name = name;
    document.head.appendChild(tag);
  }
  tag.content = content;
}

/** Keeps the document title and description in step with the current route. */
export function PageMeta({ title, description }: { title?: string; description?: string }) {
  useEffect(() => {
    document.title = title ? `${title} — ${siteConfig.title}` : siteConfig.title;
    setMeta('description', description ?? siteConfig.description);
  }, [title, description]);

  return null;
}
