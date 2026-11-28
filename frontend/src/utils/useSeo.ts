import { useEffect } from "react";

const SITE_URL = "https://hackdekh.jdecodes.tech";
const DEFAULT_IMAGE = `${SITE_URL}/BrandImages/HackDekhBanner.png`;

export interface SeoConfig {
  title: string;
  description: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  type?: "website" | "article";
  jsonLd?: Record<string, any> | null;
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Updates document title, canonical URL, Open Graph, Twitter Card, robots, and optional JSON-LD per route.
 */
export function useSeo({
  title,
  description,
  path = "/",
  image,
  noIndex = false,
  type = "website",
  jsonLd = null,
}: SeoConfig) {
  const jsonLdString = jsonLd ? JSON.stringify(jsonLd) : "";

  useEffect(() => {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const canonicalUrl = `${SITE_URL}${cleanPath}`;
    const ogImage = image && /^https?:\/\//i.test(image) ? image : DEFAULT_IMAGE;

    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", noIndex ? "noindex, nofollow" : "index, follow");
    upsertCanonical(canonicalUrl);

    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("property", "og:image", ogImage);

    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", ogImage);

    const existingScript = document.head.querySelector('script[data-seo-jsonld="true"]');
    if (jsonLdString) {
      const script = existingScript || document.createElement("script");
      script.setAttribute("type", "application/ld+json");
      script.setAttribute("data-seo-jsonld", "true");
      script.textContent = jsonLdString;
      if (!existingScript) {
        document.head.appendChild(script);
      }
    } else if (existingScript) {
      existingScript.remove();
    }
  }, [title, description, path, image, noIndex, type, jsonLdString]);
}
