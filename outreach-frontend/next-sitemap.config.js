/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://senditfast.ai',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  outDir: './public',

  // Exclude authenticated/private routes
  exclude: [
    '/dashboard',
    '/dashboard/*',
    '/upload',
    '/jobs',
    '/jobs/*',
    '/billing',
    '/account',
    '/add-on-credits',
    '/user-settings',
    '/support-console-rahul',
    '/api/*',
    '/test-button',
    '/jobs11',
    '/AddonSection',
    '/billing/success-demo',
  ],

  // Custom robots.txt configuration
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/upload',
          '/jobs',
          '/billing',
          '/account',
          '/add-on-credits',
          '/user-settings',
          '/api/',
          '/support-console-rahul',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/dashboard',
          '/upload',
          '/jobs',
          '/billing',
          '/account',
          '/add-on-credits',
          '/user-settings',
          '/api/',
        ],
      },
    ],
    additionalSitemaps: [
      'https://senditfast.ai/sitemap.xml',
    ],
  },

  // Transform function to customize sitemap entries
  transform: async (config, path) => {
    // Set priority and changefreq based on page type
    let priority = 0.7;
    let changefreq = 'weekly';

    if (path === '/') {
      priority = 1.0;
      changefreq = 'daily';
    } else if (path === '/features' || path === '/pricing') {
      priority = 0.9;
      changefreq = 'weekly';
    } else if (path === '/about') {
      priority = 0.8;
      changefreq = 'monthly';
    } else if (path.startsWith('/terms') || path.startsWith('/privacy')) {
      priority = 0.3;
      changefreq = 'yearly';
    }

    return {
      loc: path,
      changefreq,
      priority,
      lastmod: new Date().toISOString(),
    };
  },
};
