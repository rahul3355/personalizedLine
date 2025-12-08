import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import SendItFastLogo from "../assets/senditfast-logo.png";
import Footer from "../components/Footer";

const SEO = {
  title: "Privacy Policy | SendItFast.ai",
  description:
    "Privacy Policy for SendItFast.ai - Learn how we collect, use, and protect your data. GDPR compliant.",
  url: "https://senditfast.ai/privacy",
};

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="text-gray-500 mb-8">Last updated: December 8, 2024</p>

            <div className="prose prose-gray max-w-none">
              <h2>1. Introduction</h2>
              <p>
                SendItFast.ai ("we", "our", "us") is committed to protecting
                your privacy. This Privacy Policy explains how we collect, use,
                disclose, and safeguard your information when you use our
                Service.
              </p>

              <h2>2. Information We Collect</h2>
              <h3>Account Information</h3>
              <p>
                When you create an account using Google OAuth, we collect your
                name, email address, and profile picture from your Google
                account.
              </p>

              <h3>Prospect Data</h3>
              <p>
                When you upload files, we process the prospect data you provide
                (email addresses, names, company information). This data is used
                solely to generate personalized content.
              </p>

              <h3>Usage Data</h3>
              <p>
                We automatically collect information about how you use the
                Service, including job history, credit usage, and feature usage.
              </p>

              <h3>Payment Information</h3>
              <p>
                Payment processing is handled by Stripe. We do not store your
                credit card information. Stripe's privacy policy applies to
                payment data.
              </p>

              <h2>3. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul>
                <li>Provide and maintain the Service</li>
                <li>Process your uploaded files and generate personalized content</li>
                <li>Process payments and manage subscriptions</li>
                <li>Send service-related communications</li>
                <li>Improve and optimize the Service</li>
                <li>Comply with legal obligations</li>
              </ul>

              <h2>4. Data Retention</h2>
              <p>
                Uploaded files are automatically deleted after 30 days. Account
                information is retained while your account is active. You can
                request deletion of your data at any time.
              </p>

              <h2>5. Data Sharing</h2>
              <p>
                We do not sell your data. We may share data with:
              </p>
              <ul>
                <li>
                  <strong>Service providers:</strong> Companies that help us
                  operate the Service (hosting, payment processing)
                </li>
                <li>
                  <strong>Legal requirements:</strong> When required by law or
                  to protect our rights
                </li>
              </ul>

              <h2>6. Data Security</h2>
              <p>
                We implement industry-standard security measures, including:
              </p>
              <ul>
                <li>AES-256 encryption for data at rest</li>
                <li>TLS encryption for data in transit</li>
                <li>Regular security audits</li>
                <li>Access controls and authentication</li>
              </ul>

              <h2>7. Your Rights</h2>
              <p>You have the right to:</p>
              <ul>
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Delete your data</li>
                <li>Export your data</li>
                <li>Object to data processing</li>
                <li>Withdraw consent</li>
              </ul>

              <h2>8. Cookies</h2>
              <p>
                We use essential cookies to operate the Service. See our Cookie
                Policy for more details.
              </p>

              <h2>9. International Transfers</h2>
              <p>
                Your data may be processed in countries outside your residence.
                We ensure appropriate safeguards are in place for international
                transfers.
              </p>

              <h2>10. Children's Privacy</h2>
              <p>
                The Service is not intended for children under 16. We do not
                knowingly collect data from children.
              </p>

              <h2>11. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will
                notify you of material changes via email.
              </p>

              <h2>12. Contact Us</h2>
              <p>
                For privacy-related questions, contact us at{" "}
                <a href="mailto:privacy@senditfast.ai">privacy@senditfast.ai</a>.
              </p>
              <p>
                Data Protection Officer: privacy@senditfast.ai
              </p>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}

PrivacyPage.disableWhiteCard = true;
PrivacyPage.backgroundClassName = "bg-white";
