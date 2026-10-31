export interface Project {
  id: string;
  title: string;
  tagline: string;
  description: string;
  category: 'trading' | 'devtools' | 'apps';
  categoryLabel: string;
  image: string;
  tags: string[];
  metrics: {
    label: string;
    value: string;
  }[];
  demoUrl: string;
  githubUrl: string;
  featured?: boolean;
  highlights: string[];
}
