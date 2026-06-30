import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="message-content text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom link handling
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          // Ensure paragraphs don't add too much margin inside lists
          li: ({ children, ...props }) => {
            // Flatten nested paragraphs in list items
            return <li {...props}>{children}</li>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
