import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { GetStaticProps } from 'next';
import { motion } from 'framer-motion';
import { BlogPostMetadata } from '@/lib/blog/types';
import { getAllPostsMetadata, getFeaturedPosts, getAllCategories, getAllTags } from '@/lib/blog/utils';
import { Search, Filter, Calendar, Clock, ArrowLeft } from 'lucide-react';
import Bento1Image from "../../assets/bento1.png";
import Bento2Image from "../../assets/bento2.png";
import Bento3Image from "../../assets/bento3.png";
import Bento4Image from "../../assets/bento4.png";
import Bento5Image from "../../assets/bento5.png";
import Bento6Image from "../../assets/bento6.png";
import Footer from "../../components/Footer";

interface BlogIndexProps {
  allPosts: BlogPostMetadata[];
  featuredPosts: BlogPostMetadata[];
  categories: Array<{ name: string; slug: string; count: number }>;
  tags: Array<{ name: string; slug: string; count: number }>;
}

export default function BlogIndex({ allPosts, featuredPosts, categories, tags }: BlogIndexProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 9;

  // Bento images for blog cards
  const bentoImages = [Bento1Image, Bento2Image, Bento3Image, Bento4Image, Bento5Image, Bento6Image];

  // Filter posts based on search and category
  const filteredPosts = allPosts.filter((post) => {
    const matchesSearch =
      searchQuery === '' ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Pagination
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const paginatedPosts = filteredPosts.slice(startIndex, startIndex + postsPerPage);

  // SEO metadata
  const seo = {
    title: 'Blog - Cold Email Marketing & Personalization Tips | SendItFast',
    description:
      'Learn how to write better cold emails, increase reply rates, and scale your outreach with AI-powered personalization. Expert tips and strategies for B2B sales.',
    keywords: [
      'cold email tips',
      'email personalization',
      'B2B sales',
      'outreach strategies',
      'AI email marketing',
      'increase reply rates',
      'cold email best practices',
    ],
    canonical: 'https://senditfast.ai/blog',
    ogImage: 'https://senditfast.ai/assets/blog/og-blog.jpg',
  };

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'SendItFast Blog',
    description: seo.description,
    url: seo.canonical,
    publisher: {
      '@type': 'Organization',
      name: 'SendItFast',
      logo: {
        '@type': 'ImageObject',
        url: 'https://senditfast.ai/logo.png',
      },
    },
    blogPost: allPosts.slice(0, 10).map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      url: `https://senditfast.ai/blog/${post.slug}`,
      datePublished: post.date,
      image: `https://senditfast.ai${post.image}`,
      author: {
        '@type': 'Person',
        name: post.author,
      },
    })),
  };

  return (
    <>
      <Head>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta name="keywords" content={seo.keywords.join(', ')} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:image" content={seo.ogImage} />
        <meta property="og:url" content={seo.canonical} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seo.title} />
        <meta name="twitter:description" content={seo.description} />
        <meta name="twitter:image" content={seo.ogImage} />
        <link rel="canonical" href={seo.canonical} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </Head>

      <div className="min-h-screen bg-white">
        {/* Back Button */}
        <div className="absolute top-6 left-6 z-20">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </Link>
        </div>

        {/* Simple Header */}
        <section className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-medium text-gray-900 tracking-tight mb-8 font-serif">
              Blog
            </h1>

            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              {/* Category Filter */}
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-12 pr-8 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 appearance-none cursor-pointer min-w-[200px]"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.slug} value={category.name}>
                      {category.name} ({category.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Blog Posts Grid */}
            {paginatedPosts.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-xl text-gray-600">
                  No articles found. Try adjusting your search or filters.
                </p>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {paginatedPosts.map((post, index) => {
                    const bentoImage = bentoImages[index % bentoImages.length];

                    return (
                      <motion.div
                        key={post.slug}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: (index % 9) * 0.1 }}
                        viewport={{ once: true }}
                      >
                        <Link
                          href={`/blog/${post.slug}`}
                          className="group overflow-hidden bg-white rounded-2xl transition-all duration-300 block h-full"
                        >
                          {/* Image Area */}
                          <div className="relative h-40 sm:h-44 md:h-48 overflow-hidden">
                            <Image
                              src={bentoImage}
                              alt={post.title}
                              fill
                              className="object-cover"
                              style={{ objectPosition: "center 40%" }}
                            />
                            {/* Dark overlay on hover */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex items-center justify-center z-10">
                              <span className="text-white font-medium text-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-serif">
                                Read Article
                              </span>
                            </div>
                          </div>

                          {/* Content Area */}
                          <div className="p-6 sm:p-8 bg-white group-hover:bg-[#FFFFF0] transition-colors duration-300">
                            {/* Category Badge */}
                            <div className="mb-3">
                              <span className="px-3 py-1 bg-gray-100 text-gray-400 rounded-full text-xs font-medium">
                                {post.category}
                              </span>
                            </div>

                            {/* Title */}
                            <h3 className="text-xl font-medium text-gray-900 tracking-tight mb-3 font-serif line-clamp-2">
                              {post.title}
                            </h3>

                            {/* Description */}
                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                              {post.description}
                            </p>

                            {/* Meta Info */}
                            <div className="flex items-center gap-4 text-xs text-gray-400">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(post.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {post.readingTime}
                              </div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-16">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                      Previous
                    </button>

                    <div className="flex gap-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-4 py-2 rounded-xl transition-colors ${
                            currentPage === page
                              ? 'bg-gray-900 text-white'
                              : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  // Use optimized metadata-only functions (excludes heavy content field)
  const allPosts = getAllPostsMetadata();
  const featuredPosts = getFeaturedPosts(2);
  const categories = getAllCategories();
  const tags = getAllTags();

  return {
    props: {
      allPosts: JSON.parse(JSON.stringify(allPosts)),
      featuredPosts: JSON.parse(JSON.stringify(featuredPosts)),
      categories,
      tags,
    },
    revalidate: 3600,
  };
};
