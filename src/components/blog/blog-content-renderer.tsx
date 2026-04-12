'use client'

import ReactMarkdown from 'react-markdown'

interface BlogContentRendererProps {
  content: string
}

export function BlogContentRenderer({ content }: BlogContentRendererProps) {
  return (
    <div className="prose prose-lg md:prose-xl max-w-none
      prose-headings:font-bold prose-headings:tracking-tight
      prose-headings:text-gray-900 dark:prose-headings:text-gray-100
      prose-h1:text-3xl prose-h1:md:text-4xl prose-h1:mt-12 prose-h1:mb-6
      prose-h2:text-2xl prose-h2:md:text-3xl prose-h2:mt-10 prose-h2:mb-5
      prose-h3:text-xl prose-h3:md:text-2xl prose-h3:mt-8 prose-h3:mb-4
      prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-6
      prose-a:text-[oklch(0.55_0.18_35)] prose-a:font-medium prose-a:no-underline hover:prose-a:underline
      prose-img:rounded-2xl prose-img:shadow-md prose-img:my-8
      prose-strong:text-gray-900 dark:prose-strong:text-gray-100
      prose-code:text-[oklch(0.55_0.18_35)] prose-code:bg-[oklch(0.95_0.01_85)] dark:prose-code:bg-[oklch(0.2_0.02_45)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-medium
      prose-pre:bg-gray-900 dark:prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-pre:rounded-2xl prose-pre:shadow-lg prose-pre:border prose-pre:border-gray-800
      prose-blockquote:border-l-4 prose-blockquote:border-[oklch(0.6_0.2_35)] prose-blockquote:bg-[oklch(0.97_0.005_85)] dark:prose-blockquote:bg-[oklch(0.16_0.02_45)] prose-blockquote:rounded-r-xl prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:italic prose-blockquote:text-gray-700 dark:prose-blockquote:text-gray-300
      prose-li:text-gray-700 dark:prose-li:text-gray-300
      prose-hr:border-[oklch(0.9_0.02_85)] dark:prose-hr:border-[oklch(0.25_0.02_45)] prose-hr:my-10
      prose-ul:my-4 prose-ol:my-4
      prose-table:border prose-table:border-[oklch(0.9_0.02_85)] dark:prose-table:border-[oklch(0.25_0.02_45)] prose-table:rounded-xl prose-table:overflow-hidden
      prose-th:bg-[oklch(0.97_0.005_85)] dark:prose-th:bg-[oklch(0.18_0.02_45)] prose-th:font-semibold
      prose-tr:border-b prose-tr:border-[oklch(0.94_0.01_85)] dark:prose-tr:border-[oklch(0.22_0.02_45)]
    ">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}
