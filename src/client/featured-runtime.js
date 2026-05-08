import { ensurePathosRuntime } from './runtime-core.js';

export const registerFeaturedRuntime = function(runtimeInput) {
  const runtime = ensurePathosRuntime(runtimeInput);
  const featuredApi = runtime.apis.featured;
  const runtimeFlags = runtime.flags;

  const resetFeaturedMasonry = function(wall) {
    wall.classList.remove('is-featured-masonry');
    wall.style.height = '';
    wall.querySelectorAll('.featured-card').forEach(function(card) {
      card.style.position = '';
      card.style.width = '';
      card.style.transform = '';
      card.style.margin = '';
    });
  };

  const getFeaturedMasonryColumnCount = function(wall, gap) {
    const width = wall.clientWidth;
    if (!width) return 1;

    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 18;
    const minColumnWidth = 15 * rootFontSize;
    const maxColumnWidth = 24 * rootFontSize;
    const preferredColumnWidth = Math.min(
      Math.max(window.innerWidth * 0.22, minColumnWidth),
      maxColumnWidth,
    );

    return Math.max(2, Math.floor((width + gap) / (preferredColumnWidth + gap)));
  };

  const layoutFeaturedMasonry = function() {
    document.querySelectorAll('.featured-card-wall').forEach(function(wall) {
      if (window.matchMedia('(max-width: 768px)').matches) {
        resetFeaturedMasonry(wall);
        return;
      }

      const cards = Array.from(wall.querySelectorAll('.featured-card'));
      if (cards.length === 0) return;

      const computed = getComputedStyle(wall);
      const gap = parseFloat(computed.getPropertyValue('--featured-card-gap')) || parseFloat(computed.columnGap) || 24;
      const columnCount = getFeaturedMasonryColumnCount(wall, gap);
      const columnWidth = (wall.clientWidth - gap * (columnCount - 1)) / columnCount;
      const columnHeights = Array(columnCount).fill(0);

      wall.classList.add('is-featured-masonry');

      cards.forEach(function(card) {
        const columnIndex = columnHeights.indexOf(Math.min.apply(null, columnHeights));
        const x = columnIndex * (columnWidth + gap);
        const y = columnHeights[columnIndex];

        card.style.position = 'absolute';
        card.style.width = `${columnWidth}px`;
        card.style.margin = '0';
        card.style.transform = `translate3d(${x}px, ${y}px, 0)`;

        columnHeights[columnIndex] += card.offsetHeight + gap;
      });

      wall.style.height = `${Math.max.apply(null, columnHeights) - gap}px`;
    });
  };
  featuredApi.layoutMasonry = layoutFeaturedMasonry;

  const initFeaturedRuntime = function() {
    if (!document.querySelector('.featured-card-wall')) return;

    let featuredMasonryResizeTimer;
    if (!runtimeFlags.featuredMasonryResizeBound) {
      runtimeFlags.featuredMasonryResizeBound = true;
      window.addEventListener('resize', function() {
        clearTimeout(featuredMasonryResizeTimer);
        featuredMasonryResizeTimer = setTimeout(function() {
          if (featuredApi.layoutMasonry) {
            featuredApi.layoutMasonry();
          }
        }, 120);
      });
    }

    if (featuredApi.layoutMasonry) {
      featuredApi.layoutMasonry();
    }
  };
  featuredApi.init = initFeaturedRuntime;
  return featuredApi;
};
