import React from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { BlogPost } from '@/lib/blog/types';
import TableOfContents from './TableOfContents';
import ShareButtons from './ShareButtons';
import { Calendar, Clock, ArrowLeft, User, ArrowRight, Check } from 'lucide-react';
import Footer from '../Footer';

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
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.metaDescription} />
        <meta name="twitter:image" content={`${baseUrl}${post.image}`} />
        <link rel="canonical" href={post.canonicalUrl || postUrl} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </Head>

      <article className="min-h-screen bg-white">
        {/* Back Button */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>
        </div>

        {/* Hero Section */}
        <header className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          {/* Category Badge */}
          <div className="mb-6">
            <span className="px-4 py-2 bg-gray-100 text-gray-400 rounded-full text-sm font-medium">
              {post.category}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-medium text-gray-900 tracking-tight leading-[1.1] mb-6 font-serif">
            {post.title}
          </h1>

          {/* Description */}
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            {post.description}
          </p>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-6 text-gray-600 text-sm mb-8">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{post.author}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </time>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{post.readingTime}</span>
            </div>
          </div>

          {/* Share Buttons */}
          <ShareButtons url={postUrl} title={post.title} description={post.metaDescription} />
        </header>

        {/* Content Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-8">
              {/* Article Content - matching landing page typography */}
              <div className="prose prose-lg max-w-none">
                <style jsx global>{`
                  .prose h2 {
                    font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
                    font-size: 1.875rem;
                    font-weight: 500;
                    color: #111827;
                    margin-top: 3rem;
                    margin-bottom: 1rem;
                    line-height: 1.2;
                    letter-spacing: -0.025em;
                  }
                  .prose h3 {
                    font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
                    font-size: 1.5rem;
                    font-weight: 500;
                    color: #111827;
                    margin-top: 2rem;
                    margin-bottom: 0.75rem;
                    line-height: 1.3;
                    letter-spacing: -0.025em;
                  }
                  .prose p {
                    color: #4b5563;
                    line-height: 1.75;
                    margin-bottom: 1rem;
                  }
                  .prose a {
                    color: #111827;
                    text-decoration: underline;
                    font-weight: 500;
                  }
                  .prose a:hover {
                    color: #4b5563;
                  }
                  .prose strong {
                    color: #111827;
                    font-weight: 600;
                  }
                  .prose ul, .prose ol {
                    color: #4b5563;
                  }
                  .prose li {
                    margin-bottom: 0.5rem;
                  }
                  .prose blockquote {
                    border-left: 4px solid #e5e7eb;
                    padding-left: 1rem;
                    color: #4b5563;
                    font-style: italic;
                  }
                  .prose code {
                    background: #f3f4f6;
                    padding: 0.125rem 0.25rem;
                    border-radius: 0.25rem;
                    font-size: 0.875em;
                    color: #111827;
                  }
                  .prose pre {
                    background: #111827;
                    color: #f9fafb;
                    padding: 1rem;
                    border-radius: 0.75rem;
                    overflow-x: auto;
                  }
                  .prose pre code {
                    background: transparent;
                    padding: 0;
                    color: inherit;
                  }
                `}</style>
                {children}
              </div>

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="mt-12 pt-8 border-t border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 font-serif">
                    Related Topics
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/blog?tag=${encodeURIComponent(tag)}`}
                        className="px-4 py-2 bg-white text-gray-700 rounded-full hover:bg-gray-100 transition-colors border border-gray-200"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Share Bottom */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <ShareButtons url={postUrl} title={post.title} description={post.metaDescription} />
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-4 space-y-8">
              {/* Table of Contents */}
              {post.tableOfContents && post.tableOfContents.length > 0 && (
                <TableOfContents items={post.tableOfContents} />
              )}

              {/* Related Posts */}
              {relatedPosts.length > 0 && (
                <div className="mt-8 bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="font-medium text-gray-900 mb-4 font-serif">
                    Related Articles
                  </h3>
                  <div className="space-y-4">
                    {relatedPosts.map((relatedPost) => (
                      <Link
                        key={relatedPost.slug}
                        href={`/blog/${relatedPost.slug}`}
                        className="block group"
                      >
                        <h4 className="text-sm font-medium text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2 mb-1">
                          {relatedPost.title}
                        </h4>
                        <p className="text-xs text-gray-400">
                          {relatedPost.readingTime}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA - matching landing page button style */}
              <div className="mt-8 bg-white border border-gray-200 rounded-2xl p-8 text-center">
                <h3 className="text-xl font-medium text-gray-900 tracking-tight mb-3 font-serif">
                  Ready to scale your outreach?
                </h3>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  Generate personalized emails at scale with AI
                </p>

                <div className="relative group">
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center w-full px-6 py-3 rounded-xl text-sm font-medium text-white tracking-tight shadow-sm transition-all duration-300"
                    style={{
                      background: "linear-gradient(#5a5a5a, #1c1c1c)",
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
                    }}
                  >
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  <div className="absolute -inset-1 rounded-xl border-2 border-dashed border-black opacity-0 transition-opacity duration-300 pointer-events-none group-hover:opacity-100"></div>
                </div>

                <div className="mt-4 flex flex-col gap-2 text-xs text-gray-400">
                  <div className="flex items-center justify-center gap-1">
                    <Check className="h-3 w-3 text-gray-500" />
                    No credit card required
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <Check className="h-3 w-3 text-gray-500" />
                    Free 500 credits
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* CTA Section - Matching landing page */}
        <section className="py-24 bg-gray-50 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-medium text-gray-900 tracking-tight mb-4 font-serif">
              Start personalizing your cold emails today
            </h2>
            <p className="text-lg text-gray-600 mb-10 leading-relaxed">
              Join thousands of sales teams using SendItFast to scale their outreach
            </p>

            <div className="relative group inline-block">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center px-16 py-4 rounded-xl text-base font-medium text-white tracking-tight shadow-sm transition-all duration-300"
                style={{
                  background: "linear-gradient(#5a5a5a, #1c1c1c)",
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
                }}
              >
                Get Started Free
                <ArrowRight className="ml-3 h-5 w-5" />
              </Link>
              <div className="absolute -inset-1 rounded-xl border-2 border-dashed border-black opacity-0 transition-opacity duration-300 pointer-events-none group-hover:opacity-100"></div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-gray-400">
              <div className="flex items-center">
                <Check className="h-4 w-4 mr-2 text-gray-500" />
                No credit card required
              </div>
              <div className="flex items-center">
                <Check className="h-4 w-4 mr-2 text-gray-500" />
                Free 500 credits
              </div>
              <div className="flex items-center">
                <Check className="h-4 w-4 mr-2 text-gray-500" />
                Cancel anytime
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </article>
    </>
  );
}
