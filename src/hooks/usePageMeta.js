import { useEffect } from 'react';

const SITE_NAME = 'PBHS JROTC';
const BASE_URL = 'https://pbhsjrotc.vercel.app';

const setMetaTag = (selector, attr, value) => {
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    // selector is either name="x" or property="x" - pull the attr/value back out
    const [, key, val] = selector.match(/\[(\w+)="([^"]+)"\]/);
    el.setAttribute(key, val);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
};

/**
 * Sets document.title, meta description, canonical link, and OG/Twitter tags
 * for the current route. This is a plain SPA (no SSR/prerendering), so these
 * only apply after JS runs - real crawlers that execute JS (Google, and most
 * social-preview bots) see them; anything that only reads the raw HTML won't.
 * That's an inherent tradeoff of this architecture, not something a hook can
 * fix - the alternative is SSR/SSG, a much bigger change.
 *
 * @param {string} title - Page-specific title, shown as "{title} | PBHS JROTC"
 * @param {string} description - Page-specific meta description
 * @param {string} path - Route path (e.g. "/about") for the canonical URL
 */
export function usePageMeta({ title, description, path }) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    document.title = fullTitle;

    if (description) {
      setMetaTag('meta[name="description"]', 'content', description);
      setMetaTag('meta[property="og:description"]', 'content', description);
      setMetaTag('meta[name="twitter:description"]', 'content', description);
    }

    setMetaTag('meta[property="og:title"]', 'content', fullTitle);
    setMetaTag('meta[name="twitter:title"]', 'content', fullTitle);

    if (path) {
      const url = `${BASE_URL}${path}`;
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', url);
      setMetaTag('meta[property="og:url"]', 'content', url);
      setMetaTag('meta[name="twitter:url"]', 'content', url);
    }
  }, [title, description, path]);
}
