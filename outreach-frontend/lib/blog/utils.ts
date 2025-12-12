import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';
import { BlogPost, BlogPostMetadata, TOCItem } from './types';

const BLOG_POSTS_PATH = path.join(process.cwd(), 'content/blog');

/**
 * Get all blog post slugs from the content directory
 * Excludes documentation files (files starting with uppercase or containing certain keywords)
 */
export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(BLOG_POSTS_PATH)) {
    return [];
  }

  const files = fs.readdirSync(BLOG_POSTS_PATH);
  return files
    .filter((file) => {
      // Only include .md and .mdx files
      if (!file.endsWith('.mdx') && !file.endsWith('.md')) {
        return false;
      }

      // Exclude documentation files (uppercase start or contains GUIDE/IDEAS/README)
      const slug = file.replace(/\.mdx?$/, '');
      const isDocumentation =
        /^[A-Z]/.test(slug) || // Starts with uppercase
        slug.includes('GUIDE') ||
        slug.includes('IDEAS') ||
        slug.includes('README');

      return !isDocumentation;
    })
    .map((file) => file.replace(/\.mdx?$/, ''));
}

/**
 * Get a single blog post by slug
 */
export function getPostBySlug(slug: string): BlogPost | null {
  try {
    const fullPath = path.join(BLOG_POSTS_PATH, `${slug}.mdx`);

    if (!fs.existsSync(fullPath)) {
      // Try .md extension
      const mdPath = path.join(BLOG_POSTS_PATH, `${slug}.md`);
      if (!fs.existsSync(mdPath)) {
        return null;
      }
      return parsePost(mdPath, slug);
    }

    return parsePost(fullPath, slug);
  } catch (error) {
    console.error(`Error reading post ${slug}:`, error);
    return null;
  }
}

/**
 * Parse a blog post file and extract metadata + content
 */
function parsePost(filePath: string, slug: string): BlogPost {
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);

  const readingTimeResult = readingTime(content);
  const excerpt = data.description || content.slice(0, 160).trim() + '...';

  return {
    slug,
    title: data.title || '',
    description: data.description || '',
    date: data.date || new Date().toISOString(),
    author: data.author || 'SendItFast Team',
    authorRole: data.authorRole,
    authorImage: data.authorImage,
    image: data.image || '/assets/blog/default-cover.jpg',
    imageAlt: data.imageAlt || data.title || '',
    category: data.category || 'Uncategorized',
    tags: data.tags || [],
    readingTime: readingTimeResult.text,
    featured: data.featured || false,
    seoKeywords: data.seoKeywords || [],
    metaDescription: data.metaDescription || data.description || excerpt,
    canonicalUrl: data.canonicalUrl,
    relatedPosts: data.relatedPosts,
    content,
    excerpt,
    tableOfContents: extractTableOfContents(content),
  };
}

/**
 * Parse only the metadata from a blog post (without content/TOC for performance)
 */
function parsePostMetadata(filePath: string, slug: string): BlogPostMetadata {
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);

  const readingTimeResult = readingTime(content);
  const excerpt = data.description || content.slice(0, 160).trim() + '...';

  return {
    slug,
    title: data.title || '',
    description: data.description || '',
    date: data.date || new Date().toISOString(),
    author: data.author || 'SendItFast Team',
    authorRole: data.authorRole,
    authorImage: data.authorImage,
    image: data.image || '/assets/blog/default-cover.jpg',
    imageAlt: data.imageAlt || data.title || '',
    category: data.category || 'Uncategorized',
    tags: data.tags || [],
    readingTime: readingTimeResult.text,
    featured: data.featured || false,
    seoKeywords: data.seoKeywords || [],
    metaDescription: data.metaDescription || data.description || excerpt,
    canonicalUrl: data.canonicalUrl,
    relatedPosts: data.relatedPosts,
  };
}

/**
 * Get metadata for a single blog post (without content)
 */
export function getPostMetadataBySlug(slug: string): BlogPostMetadata | null {
  try {
    const fullPath = path.join(BLOG_POSTS_PATH, `${slug}.mdx`);

    if (!fs.existsSync(fullPath)) {
      const mdPath = path.join(BLOG_POSTS_PATH, `${slug}.md`);
      if (!fs.existsSync(mdPath)) {
        return null;
      }
      return parsePostMetadata(mdPath, slug);
    }

    return parsePostMetadata(fullPath, slug);
  } catch (error) {
    console.error(`Error reading post metadata ${slug}:`, error);
    return null;
  }
}

/**
 * Get all blog posts metadata (optimized for index pages - excludes content)
 */
export function getAllPostsMetadata(): BlogPostMetadata[] {
  const slugs = getAllPostSlugs();
  const posts = slugs
    .map((slug) => getPostMetadataBySlug(slug))
    .filter((post): post is BlogPostMetadata => post !== null)
    .sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  return posts;
}

/**
 * Get all blog posts sorted by date (newest first)
 */
export function getAllPosts(): BlogPost[] {
  const slugs = getAllPostSlugs();
  const posts = slugs
    .map((slug) => getPostBySlug(slug))
    .filter((post): post is BlogPost => post !== null)
    .sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  return posts;
}

/**
 * Get posts metadata by category (optimized - no content)
 */
export function getPostsByCategory(category: string): BlogPostMetadata[] {
  const allPosts = getAllPostsMetadata();
  return allPosts.filter(
    (post) => post.category.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Get posts metadata by tag (optimized - no content)
 */
export function getPostsByTag(tag: string): BlogPostMetadata[] {
  const allPosts = getAllPostsMetadata();
  return allPosts.filter((post) =>
    post.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
  );
}

/**
 * Get featured posts metadata (optimized - no content)
 */
export function getFeaturedPosts(limit?: number): BlogPostMetadata[] {
  const allPosts = getAllPostsMetadata();
  const featured = allPosts.filter((post) => post.featured);
  return limit ? featured.slice(0, limit) : featured;
}

/**
 * Get recent posts metadata (optimized - no content)
 */
export function getRecentPosts(limit: number = 5): BlogPostMetadata[] {
  const allPosts = getAllPostsMetadata();
  return allPosts.slice(0, limit);
}

/**
 * Get related posts based on tags and category
 */
export function getRelatedPosts(post: BlogPost, limit: number = 3): BlogPost[] {
  const allPosts = getAllPosts();

  // Filter out current post and calculate relevance score
  const scoredPosts = allPosts
    .filter((p) => p.slug !== post.slug)
    .map((p) => {
      let score = 0;

      // Same category = +3 points
      if (p.category === post.category) score += 3;

      // Shared tags = +1 point per tag
      const sharedTags = p.tags.filter((tag) => post.tags.includes(tag));
      score += sharedTags.length;

      return { post: p, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scoredPosts.slice(0, limit).map((item) => item.post);
}

/**
 * Extract table of contents from markdown content
 */
function extractTableOfContents(content: string): TOCItem[] {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const toc: TOCItem[] = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length; // Number of # characters
    const title = match[2].trim();
    const id = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    toc.push({ id, title, level });
  }

  return toc;
}

/**
 * Get all unique categories with post counts (optimized - no content)
 */
export function getAllCategories() {
  const allPosts = getAllPostsMetadata();
  const categoryMap = new Map<string, number>();

  allPosts.forEach((post) => {
    const count = categoryMap.get(post.category) || 0;
    categoryMap.set(post.category, count + 1);
  });

  return Array.from(categoryMap.entries()).map(([name, count]) => ({
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    count,
  }));
}

/**
 * Get all unique tags with post counts (optimized - no content)
 */
export function getAllTags() {
  const allPosts = getAllPostsMetadata();
  const tagMap = new Map<string, number>();

  allPosts.forEach((post) => {
    post.tags.forEach((tag) => {
      const count = tagMap.get(tag) || 0;
      tagMap.set(tag, count + 1);
    });
  });

  return Array.from(tagMap.entries())
    .map(([name, count]) => ({
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Paginate posts (works with both BlogPost and BlogPostMetadata)
 */
export function paginatePosts<T extends BlogPostMetadata>(posts: T[], page: number, perPage: number = 12) {
  const start = (page - 1) * perPage;
  const end = start + perPage;

  return {
    posts: posts.slice(start, end),
    currentPage: page,
    totalPages: Math.ceil(posts.length / perPage),
    totalPosts: posts.length,
    hasNextPage: end < posts.length,
    hasPrevPage: page > 1,
  };
}
