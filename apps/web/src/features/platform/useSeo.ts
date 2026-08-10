import { useEffect } from "react";

export function useSeo(title: string, description: string, noIndex = false) {
  useEffect(() => {
    document.title = title;
    setMeta("description", description);
    setMeta("robots", noIndex ? "noindex,nofollow" : "index,follow");
    setMeta("referrer", noIndex ? "no-referrer" : "strict-origin-when-cross-origin");
  }, [description, noIndex, title]);
}

function setMeta(name: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) { element = document.createElement("meta"); element.name = name; document.head.append(element); }
  element.content = content;
}
