import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import SendItFastLogo from "../assets/senditfast-logo.png";
import Footer from "../components/Footer";

const SEO = {
  title: "Cookie Policy | SendItFast.ai",
  description:
    "Cookie Policy for SendItFast.ai - Learn about the cookies we use and how to manage them.",
  url: "https://senditfast.ai/cookies",
};

export default function CookiesPage() {
  return (
    <>
      <Head>
        <title>{SEO.title}</title>
        <meta name="description" content={SEO.description} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={SEO.url} />
      </Head>

      <div className="min-h-screen bg-white">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center">
                <Image
                  src={SendItFastLogo}
                  alt="SendItFast.ai"
                  width={120}
                  height={28}
                  priority
                />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </div>
          </div>
        </nav>

        {/* Content */}
        <div className="pt-32 pb-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-8">
              Cookie Policy
            </h1>
            <p className="text-gray-500 mb-8">Last updated: December 8, 2024</p>

            <div className="prose prose-gray max-w-none">
              <h2>1. What Are Cookies</h2>
              <p>
                Cookies are small text files stored on your device when you
                visit a website. They help us provide you with a better
                experience and understand how you use our Service.
              </p>

              <h2>2. How We Use Cookies</h2>
              <p>SendItFast.ai uses the following types of cookies:</p>

              <h3>Essential Cookies</h3>
              <p>
                These cookies are necessary for the Service to function. They
                enable core functionality like authentication and security.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Cookie</th>
                    <th>Purpose</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>sb-access-token</td>
                    <td>Authentication</td>
                    <td>Session</td>
                  </tr>
                  <tr>
                    <td>sb-refresh-token</td>
                    <td>Authentication refresh</td>
                    <td>7 days</td>
                  </tr>
                </tbody>
              </table>

              <h3>Functional Cookies</h3>
              <p>
                These cookies remember your preferences and settings to provide
                a personalized experience.
              </p>

              <h3>Analytics Cookies</h3>
              <p>
                We may use analytics cookies to understand how visitors interact
                with the Service. This helps us improve our product.
              </p>

              <h2>3. Third-Party Cookies</h2>
              <p>
                Some cookies are set by third-party services we use:
              </p>
              <ul>
                <li>
                  <strong>Google:</strong> For authentication via Google OAuth
                </li>
                <li>
                  <strong>Stripe:</strong> For payment processing
                </li>
              </ul>

              <h2>4. Managing Cookies</h2>
              <p>
                You can control cookies through your browser settings. Note that
                disabling essential cookies may affect the functionality of the
                Service.
              </p>
              <p>
                To manage cookies in common browsers:
              </p>
              <ul>
                <li>
                  <a
                    href="https://support.google.com/chrome/answer/95647"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Chrome
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Firefox
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Safari
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Edge
                  </a>
                </li>
              </ul>

              <h2>5. Do Not Track</h2>
              <p>
                We respect Do Not Track (DNT) browser settings. When DNT is
                enabled, we limit our use of tracking technologies.
              </p>

              <h2>6. Updates to This Policy</h2>
              <p>
                We may update this Cookie Policy from time to time. Check this
                page for the latest version.
              </p>

              <h2>7. Contact Us</h2>
              <p>
                For questions about our use of cookies, contact us at{" "}
                <a href="mailto:privacy@senditfast.ai">privacy@senditfast.ai</a>.
              </p>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}

CookiesPage.disableWhiteCard = true;
CookiesPage.backgroundClassName = "bg-white";
