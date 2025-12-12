import React from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { BlogPost } from '@/lib/blog/types';
import TableOfContents from './TableOfContents';
import ShareButtons from './ShareButtons';
import { Calendar, Clock, ArrowLeft, User } from 'lucide-react';

interface BlogLayoutProps {
  post: BlogPost;
  children: React.ReactNode;
  relatedPosts?: BlogPost[];
}

export default function BlogLayout({ post, children, relatedPosts = [] }: BlogLayoutProps) {
  const baseUrl = 'https://senditfast.ai';
  const postUrl = `${baseUrl}/blog/${post.slug}`;

  // Generate structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.metaDescription,
    image: `${baseUrl}${post.image}`,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      '@type': 'Person',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'SendItFast',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
    keywords: post.seoKeywords.join(', '),
  };

  return (
    <>
      <Head>
        <title>{post.title} | SendItFast Blog</title>
        <meta name="description" content={post.metaDescription} />
        <meta name="keywords" content={post.seoKeywords.join(', ')} />
        <meta name="author" content={post.author} />

        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.metaDescription} />
        <meta property="og:image" content={`${baseUrl}${post.image}`} />
        <meta property="og:url" content={postUrl} />
        <meta property="og:site_name" content="SendItFast" />
        <meta property="article:published_time" content={post.date} />
        <meta property="article:author" content={post.author} />
        <meta property="article:section" content={post.category} />
        {post.tags.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.metaDescription} />
        <meta name="twitter:image" content={`${baseUrl}${post.image}`} />

        {/* Canonical URL */}
        <link rel="canonical" href={post.canonicalUrl || postUrl} />

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </Head>

      <article className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        {/* Back Button */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>
        </div>

        {/* Hero Section */}
        <header className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Category Badge */}
          <div className="mb-6">
            <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
              {post.category}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            {post.title}
          </h1>

          {/* Description */}
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            {post.description}
          </p>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-6 text-gray-600 dark:text-gray-400 mb-8">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              <span>{post.author}</span>
              {post.authorRole && <span className="text-sm">• {post.authorRole}</span>}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </time>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>{post.readingTime}</span>
            </div>
          </div>

          {/* Share Buttons */}
          <ShareButtons url={postUrl} title={post.title} description={post.metaDescription} />

          {/* Featured Image */}
          <div className="relative w-full h-[400px] rounded-2xl overflow-hidden mt-8">
            <Image
              src={post.image}
              alt={post.imageAlt}
              fill
              className="object-cover"
              priority
            />
          </div>
        </header>

        {/* Content Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-8">
              <div className="prose prose-lg dark:prose-invert max-w-none">
                {children}
              </div>

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/blog?tag=${encodeURIComponent(tag)}`}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Share Bottom */}
              <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                <ShareButtons url={postUrl} title={post.title} description={post.metaDescription} />
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-4">
              {/* Table of Contents */}
              {post.tableOfContents && post.tableOfContents.length > 0 && (
                <TableOfContents items={post.tableOfContents} />
              )}

              {/* Related Posts */}
              {relatedPosts.length > 0 && (
                <div className="mt-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                    Related Articles
                  </h3>
                  <div className="space-y-4">
                    {relatedPosts.map((relatedPost) => (
                      <Link
                        key={relatedPost.slug}
                        href={`/blog/${relatedPost.slug}`}
                        className="block group"
                      >
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 mb-1">
                          {relatedPost.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {relatedPost.readingTime}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="mt-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-6 text-white">
                <h3 className="font-bold text-xl mb-2">Try SendItFast Today</h3>
                <p className="text-sm mb-4 text-blue-100">
                  Personalize your cold emails at scale with AI
                </p>
                <Link
                  href="/pricing"
                  className="block w-full bg-white text-blue-600 text-center font-semibold py-2 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Get Started Free
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </article>
    </>
  );
}
