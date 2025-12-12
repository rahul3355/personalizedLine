import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BlogPostMetadata } from '@/lib/blog/types';
import { Calendar, Clock, ArrowRight } from 'lucide-react';

interface BlogCardProps {
  post: BlogPostMetadata;
  featured?: boolean;
}

export default function BlogCard({ post, featured = false }: BlogCardProps) {
  const cardClasses = featured
    ? 'group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col md:flex-row'
    : 'group relative overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-md hover:shadow-xl transition-all duration-300';

  return (
    <Link href={`/blog/${post.slug}`} className={cardClasses}>
      {/* Image */}
      <div className={featured ? 'md:w-1/2 relative h-64 md:h-auto' : 'relative h-48 w-full'}>
        <Image
          src={post.image}
          alt={post.imageAlt}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {post.featured && (
          <div className="absolute top-4 left-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
            Featured
          </div>
        )}
      </div>

      {/* Content */}
      <div className={featured ? 'md:w-1/2 p-6 md:p-8 flex flex-col justify-between' : 'p-6'}>
        {/* Category & Reading Time */}
        <div>
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium">
              {post.category}
            </span>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{post.readingTime}</span>
            </div>
          </div>

          {/* Title */}
          <h3
            className={
              featured
                ? 'text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2'
                : 'text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2'
            }
          >
            {post.title}
          </h3>

          {/* Description */}
          <p
            className={
              featured
                ? 'text-gray-600 dark:text-gray-300 mb-4 line-clamp-3'
                : 'text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2'
            }
          >
            {post.description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </time>
          </div>

          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium group-hover:gap-3 transition-all">
            Read more
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
