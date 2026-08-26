import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop Component
 * Ensures that upon route change / page navigation, the page always opens at the top,
 * anchored at the header text "Най-добрата идея за хранене" (app-top-anchor),
 * unless a page has an intentional custom anchor (e.g. Home page search/author filter).
 */
const ScrollToTop = () => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    // 1. If URL has a specific hash (e.g., #section-id), attempt smooth scroll to that element
    if (hash) {
      const element = document.getElementById(hash.replace('#', ''));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    // 2. Check if Home page is opened with search or author query params that have intentional custom scroll targets
    const params = new URLSearchParams(search);
    const isHomeWithCustomScroll = pathname === '/' && (params.has('search') || params.has('q') || params.has('author'));

    if (!isHomeWithCustomScroll) {
      // 3. Scroll window to top (0, 0) and scroll anchor into view
      window.scrollTo(0, 0);
      const topElement = document.getElementById('app-top-anchor');
      if (topElement) {
        topElement.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }
  }, [pathname, search, hash]);

  return null;
};

export default ScrollToTop;
