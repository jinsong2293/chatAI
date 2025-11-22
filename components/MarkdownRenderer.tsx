import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        strong: ({ children }) => <strong className="font-bold text-stone-900">{children}</strong>,
        em: ({ children }) => <em className="italic text-stone-700">{children}</em>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2 text-stone-800 font-serif">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-2 text-stone-800 font-serif">{children}</h2>,
        h3: ({ children }) => <h3 className="text-md font-bold mt-2 mb-1 text-stone-800 font-serif">{children}</h3>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-stone-300 pl-3 my-2 italic text-stone-600 bg-stone-50 p-2 rounded-r">
            {children}
          </blockquote>
        ),
        code: ({ children }) => (
          <code className="bg-stone-200 text-stone-800 px-1 py-0.5 rounded text-sm font-mono">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="bg-stone-800 text-stone-100 p-3 rounded-lg overflow-x-auto my-2 text-sm font-mono shadow-inner">
            {children}
          </pre>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;
