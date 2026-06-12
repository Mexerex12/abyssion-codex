import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

marked.setOptions({ gfm: true, breaks: true });

export function renderMarkdown(md: string | null | undefined): string {
  if (!md) return "";
  const html = marked.parse(md, { async: false }) as string;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p","br","strong","em","u","s","blockquote","ul","ol","li","h1","h2","h3","h4","h5","h6",
      "a","code","pre","hr","img","table","thead","tbody","tr","th","td","span","mark","sup","sub",
    ],
    ALLOWED_ATTR: ["href","title","alt","src","class","target","rel"],
  });
}
