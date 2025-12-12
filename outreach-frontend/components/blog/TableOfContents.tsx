import React, { useState, useEffect } from 'react';
import { TOCItem } from '@/lib/blog/types';
import { List } from 'lucide-react';

interface TableOfContentsProps {
  items: TOCItem[];
}

export default function TableOfContents({ items }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '0% 0% -80% 0%' }
    );

    const headings = items.map((item) => document.getElementById(item.id)).filter(Boolean);
    headings.forEach((heading) => heading && observer.observe(heading));

    return () => {
      headings.forEach((heading) => heading && observer.unobserve(heading));
    };
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav className="sticky top-24 bg-white border border-gray-200 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <List className="w-5 h-5 text-gray-700" />
        <h3 className="font-medium text-gray-900 font-serif">Table of Contents</h3>
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} style={{ paddingLeft: `${(item.level - 2) * 1}rem` }}>
            <a
              href={`#${item.id}`}
              className={`block text-sm transition-colors py-1 hover:text-gray-900 ${
                activeId === item.id
                  ? 'text-gray-900 font-medium'
                  : 'text-gray-600'
              }`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(item.id)?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                });
              }}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
