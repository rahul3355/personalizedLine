import React from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import { BlogPost } from '@/lib/blog/types';
import { getAllPostSlugs, getPostBySlug, getRelatedPosts } from '@/lib/blog/utils';
import BlogLayout from '@/components/blog/BlogLayout';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';

interface BlogPostPageProps {
  post: BlogPost;
  mdxSource: MDXRemoteSerializeResult;
  relatedPosts: BlogPost[];
}

// Custom MDX components with improved styling
const mdxComponents = {
  h2: (props: any) => (
    <h2
      className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-4 scroll-mt-24"
      {...props}
    />
  ),
  h3: (props: any) => (
    <h3
      className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-3 scroll-mt-24"
      {...props}
    />
  ),
  h4: (props: any) => (
    <h4
      className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-2 scroll-mt-24"
      {...props}
    />
  ),
  p: (props: any) => <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed" {...props} />,
  ul: (props: any) => <ul className="list-disc list-inside mb-4 space-y-2 ml-4" {...props} />,
  ol: (props: any) => <ol className="list-decimal list-inside mb-4 space-y-2 ml-4" {...props} />,
  li: (props: any) => <li className="text-gray-700 dark:text-gray-300" {...props} />,
  blockquote: (props: any) => (
    <blockquote
      className="border-l-4 border-blue-500 pl-4 py-2 my-6 bg-blue-50 dark:bg-blue-900/20 rounded-r-lg italic text-gray-700 dark:text-gray-300"
      {...props}
    />
  ),
  code: (props: any) => (
    <code
      className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono text-blue-600 dark:text-blue-400"
      {...props}
    />
  ),
  pre: (props: any) => (
    <pre
      className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-6 text-sm"
      {...props}
    />
  ),
  a: (props: any) => (
    <a
      className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
      target={props.href?.startsWith('http') ? '_blank' : undefined}
      rel={props.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      {...props}
    />
  ),
  img: (props: any) => (
    <img className="rounded-lg my-8 w-full shadow-lg" alt={props.alt || ''} {...props} />
  ),
  hr: () => <hr className="my-8 border-gray-200 dark:border-gray-700" />,
  table: (props: any) => (
    <div className="overflow-x-auto my-6">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" {...props} />
    </div>
  ),
  th: (props: any) => (
    <th
      className="px-6 py-3 bg-gray-50 dark:bg-gray-800 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
      {...props}
    />
  ),
  td: (props: any) => (
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300" {...props} />
  ),
  // Custom callout component
  Callout: ({ children, type = 'info' }: { children: React.ReactNode; type?: string }) => {
    const styles = {
      info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-900 dark:text-blue-100',
      warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 text-yellow-900 dark:text-yellow-100',
      success: 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-900 dark:text-green-100',
      danger: 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-900 dark:text-red-100',
    };
    return (
      <div className={`border-l-4 p-4 my-6 rounded-r-lg ${styles[type as keyof typeof styles]}`}>
        {children}
      </div>
    );
  },
};

export default function BlogPostPage({ post, mdxSource, relatedPosts }: BlogPostPageProps) {
  return (
    <BlogLayout post={post} relatedPosts={relatedPosts}>
      <MDXRemote {...mdxSource} components={mdxComponents} />

      {/* FAQ Section for SEO */}
      <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              How can I implement this strategy?
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              Start by following the steps outlined in this guide. For automated solutions, try{' '}
              <a href="/pricing" className="text-blue-600 hover:underline">
                SendItFast
              </a>{' '}
              to scale your personalization efforts.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              What results can I expect?
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              Results vary, but most users see a 2-5x increase in reply rates when implementing
              proper personalization strategies compared to generic templates.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section - Matching theme */}
      <div className="mt-16 pt-8 border-t border-gray-200">
        <div className="bg-gray-50 rounded-2xl p-8 sm:p-12 text-center">
          <h2 className="text-3xl sm:text-4xl font-medium text-gray-900 tracking-tight mb-4 font-serif">
            Ready to Scale Your Cold Email Outreach?
          </h2>
          <p className="text-lg text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto">
            SendItFast uses AI to personalize cold emails at scale, helping you get 3x more replies
            without hiring VAs or spending hours on research.
          </p>

          <div className="relative group inline-block">
            <a
              href="/pricing"
              className="inline-flex items-center justify-center px-12 py-4 rounded-xl text-base font-medium text-white tracking-tight shadow-sm transition-all duration-300"
              style={{
                background: "linear-gradient(#5a5a5a, #1c1c1c)",
                fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
              }}
            >
              Start Free Trial
              <ArrowRight className="ml-3 h-5 w-5" />
            </a>
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
      </div>
    </BlogLayout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = getAllPostSlugs();

  return {
    paths: slugs.map((slug) => ({
      params: { slug },
    })),
    fallback: 'blocking', // Generate new pages on demand
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const slug = params?.slug as string;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      notFound: true,
    };
  }

  const mdxSource = await serialize(post.content, {
    mdxOptions: {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [
        rehypeSlug,
        [rehypeAutolinkHeadings, { behavior: 'wrap' }],
        rehypeHighlight,
      ],
    },
  });

  const relatedPosts = getRelatedPosts(post, 3);

  return {
    props: {
      post: JSON.parse(JSON.stringify(post)),
      mdxSource,
      relatedPosts: JSON.parse(JSON.stringify(relatedPosts)),
    },
    revalidate: 3600, // Revalidate every hour
  };
};
