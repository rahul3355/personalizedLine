// pages/_document.tsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Primary Meta Tags */}
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="theme-color" content="#4F55F1" />
        <meta name="msapplication-TileColor" content="#4F55F1" />

        {/* Default SEO - overridden by page-specific meta */}
        <meta
          name="description"
          content="SendItFast.ai - Generate personalized cold emails at scale with AI. Upload your prospect list, get research-backed email openers in minutes. Perfect for B2B sales, agencies, and GTM teams."
        />
        <meta
          name="keywords"
          content="AI email personalization, cold email automation, personalized outreach, bulk email personalization, AI cold email, email outreach tool, B2B email, sales automation, GTM tools, lead generation, prospect research, email copywriting AI, SendItFast, senditfast.ai"
        />
        <meta name="author" content="SendItFast.ai" />
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow" />

        {/* Open Graph / Facebook - Default */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="SendItFast.ai" />
        <meta property="og:locale" content="en_US" />

        {/* Twitter - Default */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@senditfast" />
        <meta name="twitter:creator" content="@senditfast" />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" sizes="any" />

        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        {/* Google Fonts - Inter for body, system fonts as fallback */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />

        {/* Google Identity Services script */}
        <script
          src="https://accounts.google.com/gsi/client"
          async
          defer
        ></script>

        {/* Schema.org Organization Markup - Global */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "SendItFast.ai",
              url: "https://senditfast.ai",
              logo: "https://senditfast.ai/logo.png",
              description:
                "AI-powered personalized cold email generation at scale. Research, write, and send personalized emails to thousands of prospects in minutes.",
              sameAs: [
                "https://twitter.com/senditfast",
                "https://linkedin.com/company/senditfast",
                "https://youtube.com/@senditfast",
              ],
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer support",
                email: "support@senditfast.ai",
              },
            }),
          }}
        />

        {/* Schema.org WebSite Markup with SearchAction */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "SendItFast.ai",
              url: "https://senditfast.ai",
              description:
                "AI-powered personalized cold email at scale",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://senditfast.ai/search?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />

        {/* Schema.org SoftwareApplication Markup */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "SendItFast.ai",
              applicationCategory: "BusinessApplication",
              applicationSubCategory: "Sales Software",
              operatingSystem: "Web Browser",
              url: "https://senditfast.ai",
              description:
                "AI-powered platform that researches prospects and generates personalized cold email openers at scale. Upload CSV/Excel files, get personalized outreach in minutes.",
              offers: [
                {
                  "@type": "Offer",
                  name: "Free Plan",
                  price: "0",
                  priceCurrency: "USD",
                  description: "500 free credits to start",
                },
                {
                  "@type": "Offer",
                  name: "Starter Plan",
                  price: "49",
                  priceCurrency: "USD",
                  description: "2,000 credits per month",
                  priceValidUntil: "2025-12-31",
                },
                {
                  "@type": "Offer",
                  name: "Growth Plan",
                  price: "149",
                  priceCurrency: "USD",
                  description: "10,000 credits per month",
                  priceValidUntil: "2025-12-31",
                },
                {
                  "@type": "Offer",
                  name: "Pro Plan",
                  price: "499",
                  priceCurrency: "USD",
                  description: "40,000 credits per month",
                  priceValidUntil: "2025-12-31",
                },
              ],
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                ratingCount: "127",
                bestRating: "5",
                worstRating: "1",
              },
              featureList: [
                "AI-powered prospect research using real-time web search",
                "Personalized email opener generation",
                "Bulk CSV and Excel file processing up to 100,000 rows",
                "Export to any CRM (Salesforce, HubSpot, etc.)",
                "Real-time job progress tracking",
                "Credit-based transparent pricing",
                "GDPR compliant data handling",
              ],
              screenshot: "https://senditfast.ai/screenshot.png",
            }),
          }}
        />

        {/* Breadcrumb Schema - Homepage */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: "https://senditfast.ai",
                },
              ],
            }),
          }}
        />

        {/* FAQ Schema for common questions */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "What is SendItFast.ai?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "SendItFast.ai is an AI-powered platform that researches prospects and generates personalized cold email openers at scale. Upload a CSV or Excel file with prospect emails, and get back the same file enriched with unique, research-backed personalized lines for each prospect.",
                  },
                },
                {
                  "@type": "Question",
                  name: "How does AI email personalization work?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "SendItFast uses AI to search the web in real-time for each prospect, finding relevant signals like company news, personal achievements, and industry trends. The AI then synthesizes these findings and generates a unique, human-sounding email opener that references specific details about that person.",
                  },
                },
                {
                  "@type": "Question",
                  name: "How many prospects can I process at once?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "SendItFast supports files with up to 100,000 rows. Our parallel processing architecture handles large files efficiently, processing thousands of prospects simultaneously.",
                  },
                },
                {
                  "@type": "Question",
                  name: "What is the pricing for SendItFast?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "SendItFast offers a free tier with 500 credits, and paid plans starting at $49/month for 2,000 credits (Starter), $149/month for 10,000 credits (Growth), and $499/month for 40,000 credits (Pro). 1 credit = 1 prospect personalized.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Does SendItFast send emails?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "No, SendItFast focuses purely on research and personalization. We don't send emails or connect to your inbox. You upload a file, we generate personalized lines, and you download the enriched file to use with any email tool you prefer.",
                  },
                },
              ],
            }),
          }}
        />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
