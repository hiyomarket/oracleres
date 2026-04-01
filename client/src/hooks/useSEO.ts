import { useEffect } from "react";
interface SEOProps { title?: string; description?: string; ogImage?: string; ogType?: string; }
export function useSEO({ title, description, ogImage, ogType = "website" }: SEOProps) {
  useEffect(() => {
    if (title) document.title = title + " | 天命共振";
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector("meta[name=\"" + name + "\"], meta[property=\"" + name + "\"]") as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.setAttribute(name.startsWith("og:") ? "property" : "name", name); document.head.appendChild(el); }
      el.content = content;
    };
    if (description) { setMeta("description", description); setMeta("og:description", description); }
    if (title) setMeta("og:title", title);
    if (ogImage) setMeta("og:image", ogImage);
    setMeta("og:type", ogType);
  }, [title, description, ogImage, ogType]);
}
