import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SERIF_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,500;8..60,600;8..60,700&display=swap";

/** Load the public site's heading font only on public pages, not in the admin portal. */
export function usePublicSiteFont() {
  useEffect(() => {
    if (document.querySelector(`link[href="${SERIF_FONT_HREF}"]`)) return;
    const preconnect = document.createElement("link");
    preconnect.rel = "preconnect";
    preconnect.href = "https://fonts.gstatic.com";
    preconnect.crossOrigin = "";
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = SERIF_FONT_HREF;
    document.head.append(preconnect, stylesheet);
  }, []);
}

/** React Router does not scroll to `#section` links, so do it when the hash changes. */
export function useScrollToHash() {
  const { hash, key } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash, key]);
}
