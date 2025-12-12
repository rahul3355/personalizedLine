import React from 'react';
import { Twitter, Linkedin, Facebook, Link2, Mail } from 'lucide-react';

interface ShareButtonsProps {
  url: string;
  title: string;
  description: string;
}

export default function ShareButtons({ url, title, description }: ShareButtonsProps) {
  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(description + '\n\n' + url)}`,
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const buttonClass =
    'p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors';

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Share:</span>

      <a
        href={shareLinks.twitter}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
        aria-label="Share on Twitter"
      >
        <Twitter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </a>

      <a
        href={shareLinks.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
        aria-label="Share on LinkedIn"
      >
        <Linkedin className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </a>

      <a
        href={shareLinks.facebook}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
        aria-label="Share on Facebook"
      >
        <Facebook className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </a>

      <a
        href={shareLinks.email}
        className={buttonClass}
        aria-label="Share via Email"
      >
        <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </a>

      <button
        onClick={copyToClipboard}
        className={buttonClass}
        aria-label="Copy link"
      >
        <Link2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>
    </div>
  );
}
