import { Fragment } from "react";
import {
  parseMarkdown,
  type MdBlock,
  type MdInline,
} from "@/lib/marketing-markdown";

// Renderiza a AST como elementos React. Nada de dangerouslySetInnerHTML: é o
// que torna XSS impossível no preview, sem sanitizador nem DOM.
export function MarkdownPreview({ source }: { source: string }) {
  const blocks = parseMarkdown(source);

  if (blocks.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        A prévia aparece aqui conforme você escreve.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  );
}

const HEADING_CLASSES: Record<number, string> = {
  1: "text-xl font-semibold text-slate-900",
  2: "text-lg font-semibold text-slate-900",
  3: "text-base font-semibold text-slate-900",
  4: "text-sm font-semibold text-slate-900",
  5: "text-sm font-semibold text-slate-700",
  6: "text-xs font-semibold text-slate-500",
};

function Block({ block }: { block: MdBlock }) {
  switch (block.type) {
    case "heading": {
      const Tag = `h${block.level}` as "h1";
      return (
        <Tag className={HEADING_CLASSES[block.level]}>
          <Inline nodes={block.inline} />
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p className="text-sm leading-relaxed text-slate-700">
          <Inline nodes={block.inline} />
        </p>
      );
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag
          className={`flex list-outside flex-col gap-1 pl-5 text-sm leading-relaxed text-slate-700 ${
            block.ordered ? "list-decimal" : "list-disc"
          }`}
        >
          {block.items.map((item, index) => (
            <li key={index}>
              <Inline nodes={item} />
            </li>
          ))}
        </Tag>
      );
    }
    case "quote":
      return (
        <blockquote className="border-l-2 border-slate-200 pl-4 text-sm italic leading-relaxed text-slate-600">
          <Inline nodes={block.inline} />
        </blockquote>
      );
    case "code":
      return (
        <pre className="overflow-x-auto rounded-sm border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
          <code>{block.text}</code>
        </pre>
      );
    case "image":
      return (
        // eslint-disable-next-line @next/next/no-img-element -- prévia de autoria: a URL é arbitrária e o next/image exigiria allowlist de domínio.
        <img
          src={block.src}
          alt={block.alt}
          className="max-w-full rounded-sm border border-slate-200"
        />
      );
    case "hr":
      return <hr className="border-t border-slate-200" />;
  }
}

function Inline({ nodes }: { nodes: MdInline[] }) {
  return (
    <>
      {nodes.map((node, index) => (
        <Fragment key={index}>
          <InlineNode node={node} />
        </Fragment>
      ))}
    </>
  );
}

function InlineNode({ node }: { node: MdInline }) {
  switch (node.type) {
    case "text":
      return <>{node.text}</>;
    case "strong":
      return (
        <strong className="font-semibold text-slate-900">
          <Inline nodes={node.children} />
        </strong>
      );
    case "em":
      return (
        <em>
          <Inline nodes={node.children} />
        </em>
      );
    case "code":
      return (
        <code className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[0.85em] text-slate-700">
          {node.text}
        </code>
      );
    case "link":
      return (
        // isSafeUrl já barrou javascript:/data: no parser.
        <a
          href={node.href}
          target="_blank"
          rel="noreferrer noopener"
          className="font-medium text-primary hover:underline hover:underline-offset-[3px]"
        >
          <Inline nodes={node.children} />
        </a>
      );
  }
}
