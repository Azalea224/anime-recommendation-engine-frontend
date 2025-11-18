'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '@/types/api';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-blue-600 text-white'
            : isSystem
            ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
            : 'bg-gray-200 dark:bg-zinc-800 text-black dark:text-white'
        }`}
      >
        <div className="text-sm break-words markdown-content leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[
              // Custom plugin to unwrap code blocks from paragraphs
              () => (tree: any) => {
                const toReplace: Array<{ parent: any; index: number; node: any }> = [];
                
                const visit = (node: any, index: number | null, parent: any) => {
                  if (node.type === 'element' && node.tagName === 'p') {
                    // Check if paragraph contains a code/pre element
                    const hasCodeBlock = node.children?.some(
                      (child: any) => 
                        child.type === 'element' && 
                        (child.tagName === 'pre' || child.tagName === 'code')
                    );
                    
                    if (hasCodeBlock && parent && typeof index === 'number') {
                      toReplace.push({ parent, index, node });
                    }
                  }
                  
                  // Recursively visit children
                  if (node.children) {
                    node.children.forEach((child: any, i: number) => {
                      visit(child, i, node);
                    });
                  }
                };
                
                if (tree.children) {
                  tree.children.forEach((child: any, i: number) => {
                    visit(child, i, tree);
                  });
                }
                
                // Replace in reverse order to maintain indices
                for (let i = toReplace.length - 1; i >= 0; i--) {
                  const { parent, index, node } = toReplace[i];
                  parent.children.splice(index, 1, ...node.children);
                }
              },
            ]}
            components={{
              // Headings
              h1: ({ node, ...props }: any) => (
                <h1 className="text-lg font-bold mt-4 mb-2 first:mt-0" {...props} />
              ),
              h2: ({ node, ...props }: any) => (
                <h2 className="text-base font-bold mt-4 mb-2 first:mt-0" {...props} />
              ),
              h3: ({ node, ...props }: any) => (
                <h3 className="text-sm font-bold mt-3 mb-2 first:mt-0" {...props} />
              ),
              // Paragraphs - unwrap if they contain block elements
              p: ({ node, children, ...props }: any) => {
                // Check if this paragraph contains any block-level elements
                // by examining the node structure from ReactMarkdown
                const childrenArray = React.Children.toArray(children);
                
                // Check for pre elements or other block elements
                const hasBlockElement = childrenArray.some((child: any) => {
                  if (!child || typeof child !== 'object') return false;
                  
                  // Check if child is a pre element
                  if (child.type === 'pre') return true;
                  
                  // Check if child's props indicate it's a block element
                  if (child.props) {
                    // Check className for block indicators
                    const className = child.props.className || '';
                    if (typeof className === 'string' && className.includes('block')) return true;
                    
                    // Check if it's a pre element by checking the component
                    if (child.props.children) {
                      const nestedChildren = React.Children.toArray(child.props.children);
                      if (nestedChildren.some((nc: any) => nc?.type === 'pre' || nc?.type === 'code')) {
                        return true;
                      }
                    }
                  }
                  
                  return false;
                });
                
                // If paragraph contains block elements, render as div to avoid invalid HTML
                if (hasBlockElement) {
                  return (
                    <div className="my-3 leading-relaxed first:mt-0 last:mb-0" {...props}>
                      {children}
                    </div>
                  );
                }
                
                return (
                  <p className="my-3 leading-relaxed first:mt-0 last:mb-0" {...props}>
                    {children}
                  </p>
                );
              },
              // Lists
              ul: ({ node, ...props }: any) => (
                <ul className="list-disc list-outside my-3 ml-4 space-y-1.5 first:mt-0 last:mb-0" {...props} />
              ),
              ol: ({ node, ...props }: any) => (
                <ol className="list-decimal list-outside my-3 ml-4 space-y-1.5 first:mt-0 last:mb-0" {...props} />
              ),
              li: ({ node, ...props }: any) => (
                <li className="my-1.5 leading-relaxed" {...props} />
              ),
              // Code blocks - must be rendered outside of paragraphs
              code: ({ node, inline, className, children, ...props }: any) => {
                if (inline) {
                  return (
                    <code
                      className={`${
                        isUser
                          ? 'bg-blue-700 text-blue-100'
                          : 'bg-gray-300 dark:bg-zinc-700 text-gray-800 dark:text-zinc-200'
                      } px-1.5 py-0.5 rounded text-sm font-mono`}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }
                // For block code, render pre directly (not wrapped in paragraph)
                return (
                  <pre
                    className={`${
                      isUser
                        ? 'bg-blue-700 text-blue-100'
                        : 'bg-gray-300 dark:bg-zinc-700 text-gray-800 dark:text-zinc-200'
                    } p-3 rounded overflow-x-auto my-4 first:mt-0 last:mb-0 block`}
                    {...props}
                  >
                    <code className="text-sm font-mono leading-relaxed">{children}</code>
                  </pre>
                );
              },
              // Links
              a: ({ node, ...props }: any) => (
                <a
                  className={`${
                    isUser
                      ? 'text-blue-200 hover:text-blue-100'
                      : 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
                  } underline`}
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                />
              ),
              // Strong/Bold
              strong: ({ node, ...props }: any) => (
                <strong className="font-semibold" {...props} />
              ),
              // Emphasis/Italic
              em: ({ node, ...props }: any) => (
                <em className="italic" {...props} />
              ),
              // Blockquotes
              blockquote: ({ node, ...props }: any) => (
                <blockquote
                  className={`border-l-4 pl-4 pr-2 py-2 italic my-4 first:mt-0 last:mb-0 ${
                    isUser
                      ? 'border-blue-400 bg-blue-700/20'
                      : 'border-gray-400 dark:border-zinc-600 bg-gray-200/50 dark:bg-zinc-800/50'
                  }`}
                  {...props}
                />
              ),
              // Horizontal rule
              hr: ({ node, ...props }: any) => (
                <hr className={`my-4 border-t-2 ${
                  isUser
                    ? 'border-blue-400'
                    : 'border-gray-300 dark:border-zinc-700'
                }`} {...props} />
              ),
              // Tables (from remark-gfm)
              table: ({ node, ...props }: any) => (
                <div className="overflow-x-auto my-4 first:mt-0 last:mb-0">
                  <table className="border-collapse border border-gray-300 dark:border-zinc-700 w-full" {...props} />
                </div>
              ),
              th: ({ node, ...props }: any) => (
                <th className="border border-gray-300 dark:border-zinc-700 px-3 py-2 font-semibold text-left" {...props} />
              ),
              td: ({ node, ...props }: any) => (
                <td className="border border-gray-300 dark:border-zinc-700 px-3 py-2" {...props} />
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        {message.metadata?.animeRecommendations && (
          <div className="mt-2 pt-2 border-t border-gray-300 dark:border-zinc-700">
            <p className="text-xs font-semibold mb-1">Recommendations:</p>
            <ul className="text-xs space-y-1">
              {message.metadata.animeRecommendations.map((rec, idx) => (
                <li key={idx}>
                  {rec.title} (Score: {rec.score}/100)
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-xs mt-1 opacity-70">
          {(() => {
            try {
              let date: Date;
              
              if (message.timestamp instanceof Date) {
                date = message.timestamp;
              } else if (typeof message.timestamp === 'string') {
                // Try parsing as ISO string or other formats
                date = new Date(message.timestamp);
              } else if (typeof message.timestamp === 'number') {
                // Handle Unix timestamp (in milliseconds or seconds)
                date = new Date(message.timestamp > 1000000000000 ? message.timestamp : message.timestamp * 1000);
              } else {
                // Fallback to current time if format is unknown
                date = new Date();
              }
              
              // Check if date is valid
              if (isNaN(date.getTime())) {
                console.warn('Invalid timestamp:', message.timestamp);
                return 'Just now';
              }
              
              // Format the date
              const now = new Date();
              const diffMs = now.getTime() - date.getTime();
              const diffMins = Math.floor(diffMs / 60000);
              const diffHours = Math.floor(diffMs / 3600000);
              const diffDays = Math.floor(diffMs / 86400000);
              
              // Show relative time for recent messages, absolute time for older ones
              if (diffMins < 1) {
                return 'Just now';
              } else if (diffMins < 60) {
                return `${diffMins}m ago`;
              } else if (diffHours < 24) {
                return `${diffHours}h ago`;
              } else if (diffDays < 7) {
                return `${diffDays}d ago`;
              } else {
                // For older messages, show date and time
                return date.toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                });
              }
            } catch (error) {
              console.error('Error formatting timestamp:', error, message.timestamp);
              return 'Just now';
            }
          })()}
        </p>
      </div>
    </div>
  );
}

