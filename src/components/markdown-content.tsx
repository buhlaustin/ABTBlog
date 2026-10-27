import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm prose-zinc max-w-none break-words sm:prose-base prose-headings:scroll-mt-24 prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight prose-a:break-words prose-a:text-accent prose-a:no-underline hover:prose-a:underline prose-pre:overflow-x-auto prose-table:block prose-table:max-w-full prose-table:overflow-x-auto">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
