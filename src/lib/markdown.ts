import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

marked.setOptions({ gfm: true, breaks: true });

function slugify(input: string): string {
  return input
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s|-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export type TocItem = { id: string; text: string; level: 2 | 3 };

export function renderMarkdown(md: string | null | undefined): { html: string; toc: TocItem[] } {
  if (!md) return { html: "", toc: [] };
  const raw = marked.parse(md, { async: false }) as string;
  const toc: TocItem[] = [];
  const seen = new Map<string, number>();
  const withIds = raw.replace(/<(h[23])>([\s\S]*?)<\/\1>/g, (_m, tag: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    if (!text) return `<${tag}>${inner}</${tag}>`;
    const base = slugify(text) || tag;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const id = n === 1 ? base : `${base}-${n}`;
    toc.push({ id, text, level: tag === "h2" ? 2 : 3 });
    return `<${tag} id="${id}">${inner}</${tag}>`;
  });
  const html = DOMPurify.sanitize(withIds, {
    ALLOWED_TAGS: [
      "p","br","strong","em","u","s","blockquote","ul","ol","li","h1","h2","h3","h4","h5","h6",
      "a","code","pre","hr","img","table","thead","tbody","tr","th","td","span","mark","sup","sub",
    ],
    ALLOWED_ATTR: ["href","title","alt","src","class","target","rel","id"],
  });
  return { html, toc };
}
