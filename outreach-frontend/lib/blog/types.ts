export interface BlogPostMetadata {
  title: string;
  description: string;
  date: string;
  author: string;
  authorRole?: string;
  authorImage?: string;
  image: string;
  imageAlt: string;
  slug: string;
  category: string;
  tags: string[];
  readingTime: string;
  featured?: boolean;
  seoKeywords: string[];
  metaDescription: string;
  canonicalUrl?: string;
  relatedPosts?: string[];
}

export interface BlogPost extends BlogPostMetadata {
  content: string;
  excerpt: string;
  tableOfContents?: TOCItem[];
}

export interface TOCItem {
  id: string;
  title: string;
  level: number;
}

export interface BlogCategory {
  name: string;
  slug: string;
  description: string;
  count: number;
}

export interface BlogAuthor {
  name: string;
  role: string;
  bio: string;
  image: string;
  social?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
}
