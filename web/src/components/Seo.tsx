import { useEffect } from "react";

type SeoProps = {
  title: string;
  description: string;
};

function upsertMetaByName(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export default function Seo({ title, description }: SeoProps) {
  useEffect(() => {
    document.title = title;
    upsertMetaByName("description", description);
  }, [title, description]);

  return null;
}

