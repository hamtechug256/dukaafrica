'use client'

import ReactMarkdown from 'react-markdown'

interface BlogContentRendererProps {
  content: string
}

export function BlogContentRenderer({ content }: BlogContentRendererProps) {
  return (
    <div className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-pre:bg-gray-900 dark:prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-code:text-primary prose-blockquote:border-primary prose-li:text-gray-700 dark:prose-li:text-gray-300">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}
