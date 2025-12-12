# SendItFast Blog System - Complete Guide

## 📁 Directory Structure

```
outreach-frontend/
├── content/blog/               # All blog posts (MDX files)
│   ├── post-slug.mdx
│   └── another-post.mdx
├── pages/blog/
│   ├── index.tsx              # Blog listing page
│   └── [slug].tsx             # Individual blog post page
├── components/blog/
│   ├── BlogCard.tsx           # Post card component
│   ├── BlogLayout.tsx         # Post page layout
│   ├── ShareButtons.tsx       # Social sharing
│   └── TableOfContents.tsx    # Auto-generated TOC
└── lib/blog/
    ├── types.ts               # TypeScript interfaces
    └── utils.ts               # Helper functions
```

## ✍️ Creating a New Blog Post

### Step 1: Create MDX File

Create a new file in `content/blog/` with the URL slug as filename:

```
content/blog/your-post-title.mdx
```

### Step 2: Add Frontmatter Metadata

Every blog post needs frontmatter at the top:

```mdx
---
title: "Your Blog Post Title"
description: "A compelling meta description under 160 characters"
date: "2025-01-15"
author: "SendItFast Team"
authorRole: "Cold Email Experts"
authorImage: "/assets/team/avatar.jpg"
image: "/assets/blog/your-image.jpg"
imageAlt: "Description of the image"
category: "Cold Email Strategy"
tags: ["tag1", "tag2", "tag3"]
featured: false
seoKeywords: ["keyword 1", "keyword 2", "keyword 3"]
metaDescription: "SEO-optimized description for search engines"
canonicalUrl: "https://senditfast.ai/blog/your-post-title"
relatedPosts: ["other-post-slug"]
---
```

### Step 3: Write Your Content

Write in Markdown/MDX format:

```mdx
## Main Heading (H2)

Your paragraph text here.

### Subheading (H3)

- Bullet point 1
- Bullet point 2

**Bold text** and *italic text*.

[Link text](https://example.com)

> Blockquote for important callouts

`inline code` or:

&grave;&grave;&grave;javascript
// Code block
const example = "Hello world";
&grave;&grave;&grave;
```

## 🎨 Frontmatter Fields Explained

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `title` | ✅ | Post title (50-60 chars) | "How to Write Cold Emails" |
| `description` | ✅ | Short description | "Learn proven strategies..." |
| `date` | ✅ | Publication date (YYYY-MM-DD) | "2025-01-15" |
| `author` | ✅ | Author name | "SendItFast Team" |
| `authorRole` | ❌ | Author's role/title | "Email Expert" |
| `authorImage` | ❌ | Author photo path | "/assets/team/john.jpg" |
| `image` | ✅ | Featured image path | "/assets/blog/post1.jpg" |
| `imageAlt` | ✅ | Image alt text (SEO) | "Email dashboard screenshot" |
| `category` | ✅ | Main category | "Cold Email Strategy" |
| `tags` | ✅ | Array of tags | ["email", "sales"] |
| `featured` | ❌ | Show in featured section | true/false |
| `seoKeywords` | ✅ | SEO keywords array | ["cold email", "B2B"] |
| `metaDescription` | ✅ | Meta description (160 chars) | "Discover how to..." |
| `canonicalUrl` | ❌ | Canonical URL | Full URL |
| `relatedPosts` | ❌ | Array of related post slugs | ["post-1", "post-2"] |

## 📊 SEO Best Practices

### 1. Title Optimization
- **Length:** 50-60 characters
- **Include primary keyword**
- **Make it compelling** (use numbers, power words)
- **Examples:**
  - ✅ "87 Cold Email Subject Lines That Get Opened (2025)"
  - ❌ "Subject Lines"

### 2. Meta Description
- **Length:** 150-160 characters
- **Include call-to-action**
- **Use primary keyword**
- **Examples:**
  - ✅ "Discover 87 proven cold email subject lines with 40%+ open rates. Backed by 500K+ emails sent."
  - ❌ "This post is about subject lines."

### 3. URL Slug (Filename)
- Use lowercase
- Use hyphens (not underscores)
- Include primary keyword
- Keep under 5 words
- **Examples:**
  - ✅ `cold-email-subject-lines.mdx`
  - ❌ `blog_post_123.mdx`

### 4. Image Optimization
- **File names:** descriptive, keyword-rich
  - ✅ `cold-email-personalization-tips.jpg`
  - ❌ `IMG_1234.jpg`
- **Alt text:** Descriptive for accessibility + SEO
- **Size:** Compress images (use TinyPNG, ImageOptim)
- **Dimensions:** 1200x630px for social sharing

### 5. Internal Linking
Link to other pages on your site:
- Other blog posts
- Pricing page
- Features page
- Case studies

**Example:**
```mdx
Learn more about [AI-powered personalization](/features)
or check out our [pricing plans](/pricing).
```

### 6. External Linking
Link to authoritative sources for credibility:
- Industry studies
- Research data
- Tool documentation

**Example:**
```mdx
According to [HubSpot's research](https://hubspot.com/study),
personalization increases reply rates by 112%.
```

### 7. Heading Structure
- **One H1** (title) - auto-generated from frontmatter
- **Multiple H2s** for main sections
- **H3s** for subsections
- **Include keywords** in headings naturally

## 🎯 Content Strategy for SEO

### Word Count
- **Minimum:** 1,500 words
- **Ideal:** 2,000-3,000 words
- **Sweet spot:** 2,500 words for ranking

### Content Structure
```
1. Introduction (200 words)
   - Hook: Problem or shocking stat
   - Promise: What they'll learn

2. Main Content (1,800-2,500 words)
   - Section 1: Background/context
   - Section 2: Main strategy/guide
   - Section 3: Examples/case studies
   - Section 4: Best practices

3. Conclusion (200 words)
   - Summary
   - Call-to-action
```

### Keyword Usage
- **Primary keyword** in:
  - Title
  - URL slug
  - First paragraph
  - At least one H2
  - Meta description
  - Image alt text

- **Related keywords** throughout content naturally

### Categories to Use
- "Cold Email Strategy"
- "Email Copywriting"
- "Sales Automation"
- "AI & Personalization"
- "Email Deliverability"
- "B2B Sales"
- "Outreach Tools"
- "Case Studies"

### Tags Best Practices
- Use 3-7 tags per post
- Mix broad and specific tags
- Be consistent across posts
- Examples:
  - Broad: "cold email", "B2B sales"
  - Specific: "subject lines", "personalization", "AI tools"

## 🚀 Publishing Checklist

Before publishing a new post:

- [ ] **Frontmatter complete** (all required fields)
- [ ] **Title optimized** (50-60 chars, includes keyword)
- [ ] **Meta description** (150-160 chars, compelling)
- [ ] **Featured image added** (1200x630px, compressed)
- [ ] **Image alt text** (descriptive, keyword-rich)
- [ ] **Word count 2,000+**
- [ ] **Headings use H2/H3** (not H4+)
- [ ] **Internal links** (3+ to other pages)
- [ ] **External links** (2+ to authoritative sources)
- [ ] **CTA included** (link to pricing/features)
- [ ] **Proofread** (no typos, good grammar)
- [ ] **Mobile preview** (check on phone)
- [ ] **Build test** (run `npm run build` locally)

## 🔧 Development Commands

### Run Development Server
```bash
cd outreach-frontend
npm run dev
```

Visit: `http://localhost:3000/blog`

### Build for Production
```bash
npm run build
```

### Generate Sitemap
```bash
npm run postbuild
```

This runs `next-sitemap` and adds all blog posts to `sitemap.xml`.

## 📝 Writing Tips for High-Performing Posts

### 1. Start with a Hook
❌ "In this post, we'll cover..."
✅ "I analyzed 500,000 cold emails. Here's what actually works."

### 2. Use Data and Numbers
- "87 subject lines"
- "3x more replies"
- "2,500-word guide"
- "40%+ open rates"

### 3. Write Scannable Content
- Short paragraphs (2-3 sentences)
- Bullet points and numbered lists
- Bold key takeaways
- Use headings every 300 words

### 4. Include Examples
- Before/After comparisons
- Real email templates
- Screenshots
- Case studies

### 5. Add Visual Elements
- Images
- Screenshots
- Diagrams
- Data visualizations
- Code blocks (for technical posts)

### 6. End with Strong CTA
Every post should drive action:
- Sign up for trial
- Download resource
- Book a demo
- Read related post

**Template:**
```mdx
## Ready to [Outcome They Want]?

[Brief pitch for SendItFast]

[CTA Button Link](/pricing)
```

## 🎨 Custom MDX Components

You can use these special components in your MDX:

### Callout Boxes
```mdx
<Callout type="info">
This is an informational callout.
</Callout>

<Callout type="warning">
This is a warning callout.
</Callout>

<Callout type="success">
This is a success callout.
</Callout>

<Callout type="danger">
This is a danger/error callout.
</Callout>
```

### Code Blocks with Syntax Highlighting
```mdx
&grave;&grave;&grave;javascript
const example = "This will have syntax highlighting";
&grave;&grave;&grave;
```

Supported languages: javascript, python, bash, css, html, json, typescript

## 📈 Measuring Success

Track these metrics for each blog post:

1. **Organic Traffic** (Google Analytics)
   - Pageviews
   - Unique visitors
   - Traffic sources

2. **Engagement** (GA4)
   - Time on page (goal: 3+ minutes)
   - Scroll depth (goal: 70%+)
   - Bounce rate (goal: <70%)

3. **SEO Performance** (Google Search Console)
   - Impressions
   - Click-through rate
   - Average position
   - Keyword rankings

4. **Conversions**
   - CTA clicks
   - Sign-ups from blog
   - Demo requests
   - Pricing page visits

## 🔄 Content Updates

Blog posts should be updated regularly:

- **Every 6 months:** Refresh data, update examples
- **Annually:** Rewrite if content is outdated
- **When triggered:** Product changes, industry updates

Update the `date` field in frontmatter when refreshing content.

## 🆘 Troubleshooting

### Blog post not showing up?
1. Check filename ends with `.mdx`
2. Verify frontmatter syntax (proper YAML)
3. Run `npm run build` to catch errors
4. Check `content/blog/` directory location

### Images not loading?
1. Ensure images are in `public/assets/blog/`
2. Use absolute paths: `/assets/blog/image.jpg`
3. Check image file names (lowercase, no spaces)

### Build errors?
1. Check MDX syntax (close all tags)
2. Verify frontmatter has all required fields
3. Look for special characters in frontmatter (escape quotes)

## 📚 Resources

- [MDX Documentation](https://mdxjs.com/)
- [Next.js Blog Guide](https://nextjs.org/learn/basics/dynamic-routes)
- [SEO Best Practices](https://developers.google.com/search/docs)
- [Markdown Guide](https://www.markdownguide.org/)

---

## 🎯 Quick Start: Your First Post

1. **Copy example post:**
   ```bash
   cp content/blog/how-to-personalize-cold-emails-at-scale.mdx content/blog/my-new-post.mdx
   ```

2. **Edit frontmatter** with your post details

3. **Write your content** (2,000+ words)

4. **Add featured image** to `public/assets/blog/`

5. **Test locally:**
   ```bash
   npm run dev
   ```

6. **Build & deploy:**
   ```bash
   npm run build
   npm run start
   ```

That's it! Your blog post is live at `/blog/my-new-post`
