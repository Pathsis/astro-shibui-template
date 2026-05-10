import katexCssUrl from 'katex/dist/katex.min.css?url';
import { ensurePathosRuntime } from './runtime-core.js';

const ensureKatexStyles = function() {
  if (ensureKatexStyles.promise) {
    const link = document.querySelector('link[data-pathos-katex-styles]');
    if (link instanceof HTMLLinkElement && link.isConnected) {
      return ensureKatexStyles.promise;
    }
    delete ensureKatexStyles.promise;
  }

  ensureKatexStyles.promise = new Promise(function(resolve, reject) {
    const el = document.createElement('link');
    el.rel = 'stylesheet';
    el.href = katexCssUrl;
    el.dataset.pathosKatexStyles = '';
    el.addEventListener('load', function() { resolve(el); }, { once: true });
    el.addEventListener('error', function(e) { reject(e); }, { once: true });
    document.head.appendChild(el);
  });

  return ensureKatexStyles.promise;
};

export const registerArticleRuntime = function(runtimeInput) {
  // article-runtime: TOC · inline footnotes · hanging figures · mermaid · print · selection
  const runtime = ensurePathosRuntime(runtimeInput);
  const articleApi = runtime.apis.article;
  const runtimeFlags = runtime.flags;
  const trackUmami = runtime.shared.trackUmami || function() {};
  const isArticlePage = function() {
    return document.body?.dataset?.pageKind === 'article';
  };

  let tocScrollSpyHandler = null;
  let tocOutsideHandler = null;
  let tocKeyHandler = null;
  let tocResizeHandler = null;
  let tocPlayerResizeObserver = null;
  let tocPlayerMutationObserver = null;
  let selectionTimer = null;
  let mermaidThemeListener = false;
  let mermaidLoading = false;

  const cleanupTocBindings = function() {
    if (tocScrollSpyHandler) {
      window.removeEventListener('scroll', tocScrollSpyHandler);
      tocScrollSpyHandler = null;
    }
    if (tocOutsideHandler) {
      document.removeEventListener('pointerdown', tocOutsideHandler);
      tocOutsideHandler = null;
    }
    if (tocKeyHandler) {
      document.removeEventListener('keydown', tocKeyHandler);
      tocKeyHandler = null;
    }
    if (tocResizeHandler) {
      window.removeEventListener('resize', tocResizeHandler);
      tocResizeHandler = null;
    }
    if (tocPlayerResizeObserver) {
      tocPlayerResizeObserver.disconnect();
      tocPlayerResizeObserver = null;
    }
    if (tocPlayerMutationObserver) {
      tocPlayerMutationObserver.disconnect();
      tocPlayerMutationObserver = null;
    }
  };

  const initTOC = function() {
    const tocLists = document.querySelectorAll('.toc-list');
    const content = document.querySelector('.gh-content');
    if (!isArticlePage() || tocLists.length === 0 || !content) {
      cleanupTocBindings();
      return;
    }

    const popover = document.querySelector('.toc-popover');
    const trigger = popover?.querySelector('[data-toc-trigger]');
    const panel = popover?.querySelector('[data-toc-panel]');
    if (!popover || !(trigger instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
      cleanupTocBindings();
      return;
    }

    const closePanel = function(options) {
      if (popover.getAttribute('data-toc-open') !== '1') return;
      popover.setAttribute('data-toc-open', '0');
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      if (!options?.keepFocus) {
        try { trigger.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      }
    };

    const openPanel = function() {
      if (popover.getAttribute('data-toc-open') === '1') return;
      popover.setAttribute('data-toc-open', '1');
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(function() {
        const activeLink = panel.querySelector('.toc-link.active') || panel.querySelector('.toc-link');
        if (!(activeLink instanceof HTMLElement)) return;
        try { activeLink.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
        const listEl = activeLink.closest('.toc-list');
        if (!(listEl instanceof HTMLElement)) return;
        const linkRect = activeLink.getBoundingClientRect();
        const listRect = listEl.getBoundingClientRect();
        listEl.scrollTop += (linkRect.top - listRect.top) - listRect.height / 2 + linkRect.height / 2;
      });
    };

    const togglePanel = function() {
      if (popover.getAttribute('data-toc-open') === '1') {
        closePanel();
      } else {
        openPanel();
      }
    };
    const getHeadingText = function(heading) {
      const clone = heading.cloneNode(true);
      clone.querySelectorAll('.anchor-link, .hanging-figure-ref').forEach((node) => node.remove());
      clone.querySelectorAll('.heading-anchor').forEach((node) => {
        if (node.textContent.trim() === '#') node.remove();
      });
      return clone.textContent.replace(/^#+\s*/g, '').replace(/\s*#+$/g, '').trim();
    };
    const ensureHeadingId = function(heading, fallbackId) {
      if (!heading.id) {
        heading.id = fallbackId;
      }
      return heading.id;
    };
    const syncGeneratedSections = function() {
      const isVisibleHeading = function(el) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width !== 0 || rect.height !== 0;
      };

      const footnoteHeading = content.querySelector('.footnotes h2');
      const notesSection = footnoteHeading && isVisibleHeading(footnoteHeading)
        ? {
            id: ensureHeadingId(footnoteHeading, 'article-notes'),
            text: getHeadingText(footnoteHeading),
            key: 'notes',
          }
        : null;

      const materialsHeading = content.querySelector('.mobile-hanging-figures h2, .print-article-materials h2');
      const materialsSection = materialsHeading && isVisibleHeading(materialsHeading)
        ? {
            id: ensureHeadingId(materialsHeading, 'article-materials'),
            text: getHeadingText(materialsHeading),
            key: 'materials',
          }
        : null;
      const shouldNumberNotes = content.dataset.notesNumbered !== '0';

      let totalItemCount = 0;

      tocLists.forEach(function(tocList) {
        tocList.querySelectorAll('.toc-generated-section').forEach(function(item) {
          item.remove();
        });

        const generatedSections = [];
        if (notesSection) generatedSections.push(notesSection);
        if (materialsSection) generatedSections.push(materialsSection);

        const baseItems = Array.from(tocList.querySelectorAll('li')).filter(function(item) {
          return !item.classList.contains('toc-generated-section');
        });
        if (baseItems.length === 0 && generatedSections.length === 0) {
          return;
        }
        const existingSectionTargets = new Set();

        baseItems.forEach(function(item) {
          const link = item.querySelector('.toc-link[href^="#"]');
          if (!link) return;

          const href = link.getAttribute('href');

          if (href) existingSectionTargets.add(href);
        });

        const dedupedGeneratedSections = generatedSections.filter(function(section, index, sections) {
          const href = `#${section.id}`;
          const firstMatchingIndex = sections.findIndex(function(candidate) {
            return candidate.key === section.key || candidate.id === section.id;
          });

          if (firstMatchingIndex !== index) return false;
          if (existingSectionTargets.has(href)) return false;
          return true;
        });
        const baseH2Count = tocList.querySelectorAll('li.toc-h2:not(.toc-generated-section)').length;

        let nextH2Index = baseH2Count;
        dedupedGeneratedSections.forEach(function(section) {
          const li = document.createElement('li');
          const a = document.createElement('a');
          const isUnnumberedNotes = section.key === 'notes' && !shouldNumberNotes;

          li.className = `toc-h2 toc-generated-section${section.key === 'notes' ? ' toc-item-notes' : ''}${isUnnumberedNotes ? ' toc-item-unnumbered' : ''}`;
          if (!isUnnumberedNotes) {
            nextH2Index += 1;
            a.dataset.tocNumber = `${nextH2Index}.`;
          }

          a.href = `#${section.id}`;
          a.textContent = section.text;
          a.className = 'toc-link';
          li.appendChild(a);
          tocList.appendChild(li);
        });

        totalItemCount = Math.max(totalItemCount, tocList.querySelectorAll('li').length);
      });

      if (totalItemCount === 0) {
        popover.setAttribute('data-toc-visible', '0');
        popover.style.display = 'none';
        return [];
      }

      popover.style.removeProperty('display');
      popover.style.setProperty('--toc-item-count', String(totalItemCount));

      const primaryList = tocLists[0];
      if (!primaryList) return [];

      return Array.from(primaryList.querySelectorAll('.toc-link[href^="#"]'))
        .map(function(link) {
          const targetId = link.getAttribute('href')?.slice(1);
          return targetId ? document.getElementById(targetId) : null;
        })
        .filter(function(heading) {
          if (!heading) return false;
          const rect = heading.getBoundingClientRect();
          return rect.width !== 0 || rect.height !== 0;
        });
    };

    const validHeadings = syncGeneratedSections();
    if (validHeadings.length === 0) {
      cleanupTocBindings();
      return;
    }

    document.querySelectorAll('.toc-link').forEach(function(link) {
      if (link.dataset.tocBound === '1') return;
      link.dataset.tocBound = '1';
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').slice(1);
        const target = document.getElementById(targetId);
        if (!target) return;
        try {
          const newHash = '#' + targetId;
          if (window.location.hash !== newHash) {
            history.pushState(history.state, '', newHash);
          }
        } catch (err) { /* ignore */ }
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    if (trigger.dataset.tocTriggerBound !== '1') {
      trigger.dataset.tocTriggerBound = '1';
      trigger.addEventListener('click', function() {
        togglePanel();
      });
    }

    const firstHeading = validHeadings[0];
    const getAbsoluteTop = function(el) {
      return el.getBoundingClientRect().top + window.pageYOffset;
    };
    const updateScrollState = function() {
      const scrollY = window.pageYOffset;
      let currentId = '';
      validHeadings.forEach(function(heading) {
        if (scrollY >= getAbsoluteTop(heading) - 120) {
          currentId = heading.id;
        }
      });
      if (!currentId) {
        currentId = firstHeading?.id || '';
      }
      document.querySelectorAll('.toc-link').forEach(function(link) {
        const isActive = link.getAttribute('href') === '#' + currentId;
        link.classList.toggle('active', isActive);
      });

      popover.setAttribute('data-toc-visible', '1');
    };

    cleanupTocBindings();

    let tocTicking = false;
    tocScrollSpyHandler = function() {
      if (tocTicking) return;
      tocTicking = true;
      requestAnimationFrame(function() {
        updateScrollState();
        tocTicking = false;
      });
    };
    window.addEventListener('scroll', tocScrollSpyHandler, { passive: true });

    tocResizeHandler = function() {
      syncGeneratedSections();
      updateScrollState();
    };
    window.addEventListener('resize', tocResizeHandler);

    const playerContainer = document.getElementById('podcast-player-container');
    const syncPlayerOffset = function() {
      if (!playerContainer) {
        popover.style.setProperty('--toc-player-offset', '0px');
        return;
      }
      const style = window.getComputedStyle(playerContainer);
      const visible = style.display !== 'none' && style.visibility !== 'hidden';
      const h = visible ? playerContainer.offsetHeight : 0;
      popover.style.setProperty('--toc-player-offset', `${h}px`);
    };
    if (playerContainer) {
      if (typeof ResizeObserver !== 'undefined') {
        tocPlayerResizeObserver = new ResizeObserver(syncPlayerOffset);
        tocPlayerResizeObserver.observe(playerContainer);
      }
      if (typeof MutationObserver !== 'undefined') {
        tocPlayerMutationObserver = new MutationObserver(syncPlayerOffset);
        tocPlayerMutationObserver.observe(playerContainer, {
          attributes: true,
          attributeFilter: ['style', 'class', 'hidden'],
          subtree: true,
        });
      }
    }
    syncPlayerOffset();

    updateScrollState();
  };
  articleApi.initTOC = initTOC;

  const initInlineFootnotes = function() {
    const content = document.querySelector('.gh-content');
    if (!content) return;

    content.classList.remove('has-inline-footnotes');
    content.querySelectorAll('.inline-footnote').forEach((node) => node.remove());

    if (!isArticlePage()) return;
    if (!window.matchMedia('(min-width: 769px)').matches) return;

    const footnotes = content.querySelector('.footnotes');
    if (!footnotes) return;

    const noteHtmlById = new Map();
    footnotes.querySelectorAll('li[id]').forEach((item) => {
      const clone = item.cloneNode(true);
      clone.querySelectorAll('.footnote-backref').forEach((backref) => backref.remove());

      let html = clone.innerHTML.trim();
      if (clone.children.length === 1 && clone.firstElementChild && clone.firstElementChild.tagName === 'P') {
        html = clone.firstElementChild.innerHTML.trim();
      }

      if (html) {
        noteHtmlById.set(`#${item.id}`, html);
      }
    });

    if (noteHtmlById.size === 0) return;

    let mounted = 0;
    content.querySelectorAll('a[data-footnote-ref][href^="#"]').forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;

      const noteHtml = noteHtmlById.get(href);
      if (!noteHtml) return;

      const sup = link.closest('sup');
      if (!sup || sup.nextElementSibling?.classList.contains('inline-footnote')) return;

      const number = link.textContent.trim().replace(/^\[|\]$/g, '');
      const aside = document.createElement('span');
      aside.className = 'inline-footnote';
      aside.setAttribute('data-inline-footnote', href.slice(1));
      aside.innerHTML = `
        <span class="inline-footnote-number">${number}</span>
        <span class="inline-footnote-body">${noteHtml}</span>
      `;

      sup.insertAdjacentElement('afterend', aside);
      mounted += 1;
    });

    if (mounted > 0) {
      content.classList.add('has-inline-footnotes');
    }
  };
  articleApi.initInlineFootnotes = initInlineFootnotes;

  const initMobileHangingFigures = function() {
    const content = document.querySelector('.gh-content');
    if (!content) return;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const lang = document.documentElement.lang || 'zh-cn';
    const isEnglish = lang.toLowerCase().startsWith('en');
    const notesTitle = isEnglish ? 'Notes' : '注释';
    const materialsTitle = isEnglish ? 'Materials' : '资料';
    const figureLabel = function(index) {
      return isEnglish ? `Fig. ${index}` : `图 ${index}`;
    };
    const materialSectionSelector = '.mobile-hanging-figures';
    const referenceTextTags = ['P', 'LI', 'H2', 'H3', 'H4', 'H5', 'H6'];
    const referenceCodeTags = ['PRE'];
    const referenceSkipTags = ['FIGURE'];
    const getHangingFigures = function() {
      return Array.from(content.querySelectorAll('figure.align-left, figure.align-right'))
        .filter((figure) => figure.querySelector('img') && !figure.classList.contains('mermaid-figure') && !figure.closest('.footnotes'));
    };
    const findNestedReferenceTarget = function(element, direction) {
      const nestedTargets = Array.from(element.querySelectorAll('p, li'));
      if (nestedTargets.length === 0) return null;
      return direction === 'previous' ? nestedTargets[nestedTargets.length - 1] : nestedTargets[0];
    };
    const getReferenceTargetForElement = function(element, direction) {
      if (referenceTextTags.includes(element.tagName)) {
        return { element, placement: 'append' };
      }
      if (referenceSkipTags.includes(element.tagName)) {
        return { element, placement: 'skip' };
      }
      if (['OL', 'UL', 'BLOCKQUOTE'].includes(element.tagName)) {
        const nestedTarget = findNestedReferenceTarget(element, direction);
        return nestedTarget ? { element: nestedTarget, placement: 'append' } : null;
      }
      if (referenceCodeTags.includes(element.tagName)) {
        return { element, placement: 'skip' };
      }
      return { element, placement: direction === 'previous' ? 'after' : 'before' };
    };
    const findReferenceTarget = function(figure) {
      let previous = figure.previousElementSibling;
      while (previous) {
        const target = getReferenceTargetForElement(previous, 'previous');
        if (target && target.placement !== 'skip') return target;
        previous = previous.previousElementSibling;
      }

      let next = figure.nextElementSibling;
      while (next) {
        const target = getReferenceTargetForElement(next, 'next');
        if (target && target.placement !== 'skip') return target;
        next = next.nextElementSibling;
      }

      return null;
    };
    const placeFigureReference = function(figure, reference) {
      const target = findReferenceTarget(figure);
      if (target) {
        if (target.placement === 'append') {
          target.element.append(' ', reference);
        } else if (target.placement === 'after') {
          target.element.after(reference);
        } else {
          target.element.before(reference);
        }
        return;
      }

      figure.before(reference);
    };
    const createFigureReference = function(label, href, id) {
      const reference = document.createElement('sup');
      reference.className = 'hanging-figure-ref';
      if (id) reference.id = id;

      if (href) {
        const link = document.createElement('a');
        link.href = href;
        link.textContent = label;
        reference.appendChild(link);
      } else {
        reference.textContent = label;
      }

      return reference;
    };
    const activateFootnoteHeading = function(options) {
      const footnoteHeading = content.querySelector('.footnotes h2');
      if (!footnoteHeading) return;
      const shouldSuppressNumber = !!options?.suppressNumber;

      if (!footnoteHeading.dataset.originalHtml) {
        footnoteHeading.dataset.originalHtml = footnoteHeading.innerHTML;
        footnoteHeading.dataset.originalClass = footnoteHeading.className;
      }
      footnoteHeading.textContent = notesTitle;
      footnoteHeading.classList.remove('sr-only');
      footnoteHeading.classList.add('mobile-article-section-title');
      footnoteHeading.classList.toggle('mobile-heading-unnumbered', shouldSuppressNumber);
      footnoteHeading.dataset.mobileHeadingActive = '1';
    };
    const resetFootnoteHeading = function() {
      const heading = content.querySelector('.footnotes h2');
      if (!heading || heading.dataset.mobileHeadingActive !== '1') return;
      heading.className = heading.dataset.originalClass || '';
      heading.innerHTML = heading.dataset.originalHtml || heading.textContent;
      delete heading.dataset.mobileHeadingActive;
    };
    const restoreFigures = function() {
      const section = content.querySelector(materialSectionSelector);
      if (section) {
        section.querySelectorAll('figure[data-mobile-hanging-figure-id]').forEach(function(figure) {
          const id = figure.getAttribute('data-mobile-hanging-figure-id');
          const anchor = id ? content.querySelector(`[data-mobile-hanging-anchor="${id}"]`) : null;
          const originalId = figure.getAttribute('data-mobile-hanging-original-id');
          figure.classList.remove('mobile-hanging-figure');
          figure.removeAttribute('data-mobile-hanging-figure-id');
          figure.removeAttribute('data-mobile-hanging-original-id');
          if (originalId !== null) {
            if (originalId) {
              figure.id = originalId;
            } else {
              figure.removeAttribute('id');
            }
          }
          if (anchor) {
            anchor.replaceWith(figure);
          } else {
            section.before(figure);
          }
        });
        section.remove();
      }

      content.querySelectorAll('.hanging-figure-ref, .mobile-hanging-figure-ref').forEach((ref) => ref.remove());
      content.querySelectorAll('[data-mobile-hanging-anchor]').forEach((anchor) => anchor.remove());
      content.classList.remove('has-mobile-hanging-figures');
      resetFootnoteHeading();
    };

    restoreFigures();
    content.querySelectorAll('.hanging-figure-label').forEach((label) => label.remove());
    if (!isArticlePage()) {
      if (articleApi.initTOC) articleApi.initTOC();
      return;
    }

    const figures = getHangingFigures();
    if (isMobile) {
      activateFootnoteHeading({
        suppressNumber: content.dataset.notesNumbered === '0',
      });
    }

    if (figures.length === 0) {
      if (articleApi.initTOC) articleApi.initTOC();
      return;
    }

    figures.forEach(function(figure, index) {
      const number = index + 1;
      const label = figureLabel(number);
      const figureId = `mobile-hanging-figure-${number}`;
      const refId = `mobile-hanging-figure-ref-${number}`;
      let caption = figure.querySelector('figcaption');
      if (!caption) {
        caption = document.createElement('figcaption');
        figure.appendChild(caption);
      }
      const captionLabel = document.createElement('span');
      captionLabel.className = 'hanging-figure-label';
      captionLabel.textContent = label;
      caption.prepend(captionLabel);

      const reference = createFigureReference(label, isMobile ? `#${figureId}` : null, isMobile ? refId : null);
      placeFigureReference(figure, reference);
    });

    if (!isMobile) {
      if (articleApi.initTOC) articleApi.initTOC();
      return;
    }

    const section = document.createElement('section');
    section.className = 'mobile-hanging-figures';
    section.setAttribute('aria-labelledby', 'mobile-hanging-figures-title');
    section.innerHTML = `<h2 id="mobile-hanging-figures-title" class="mobile-article-section-title">${materialsTitle}</h2>`;
    const footnotes = content.querySelector('.footnotes');
    if (footnotes) {
      footnotes.after(section);
    } else {
      content.appendChild(section);
    }

    figures.forEach(function(figure, index) {
      const number = index + 1;
      const id = `mobile-hanging-figure-${number}`;
      const refId = `mobile-hanging-figure-ref-${number}`;
      const label = figureLabel(number);
      const anchor = document.createElement('span');
      anchor.setAttribute('data-mobile-hanging-anchor', id);
      anchor.hidden = true;

      figure.before(anchor);

      figure.setAttribute('data-mobile-hanging-original-id', figure.id || '');
      figure.id = id;
      figure.setAttribute('data-mobile-hanging-figure-id', id);
      figure.classList.add('mobile-hanging-figure');

      const captionLabel = figure.querySelector('.hanging-figure-label');
      if (captionLabel) {
        captionLabel.textContent = '';
        const backref = document.createElement('a');
        backref.href = `#${refId}`;
        backref.setAttribute('aria-label', isEnglish ? `Back to ${label} reference` : `返回${label}引用处`);
        backref.textContent = label;
        captionLabel.appendChild(backref);
      }

      section.appendChild(figure);
    });

    content.classList.add('has-mobile-hanging-figures');
    if (articleApi.initTOC) articleApi.initTOC();
  };
  articleApi.initMobileHangingFigures = initMobileHangingFigures;

  if (!runtimeFlags.articlePageLoadMermaidBound) {
    runtimeFlags.articlePageLoadMermaidBound = true;
    document.addEventListener('astro:page-load', function() {
      if (articleApi.initMermaid) {
        articleApi.initMermaid();
      }
    });
  }

  const isSelectionInArticle = function(selection) {
    if (!isArticlePage() || !selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    let container = range.commonAncestorContainer;
    if (container && container.nodeType === Node.TEXT_NODE) {
      container = container.parentElement;
    }
    if (!container || !container.closest) return false;
    return !!container.closest('.gh-content');
  };

  if (!runtimeFlags.articleSelectionBound) {
    runtimeFlags.articleSelectionBound = true;
    let lastSelection = '';

    document.addEventListener('selectionchange', function() {
      const selection = window.getSelection();
      if (!selection || !isSelectionInArticle(selection)) return;
      const text = selection.toString().trim();

      if (text.length >= 5 && text !== lastSelection) {
        lastSelection = text;

        clearTimeout(selectionTimer);
        selectionTimer = setTimeout(function() {
          const currentSelection = window.getSelection();
          if (isSelectionInArticle(currentSelection) &&
              currentSelection.toString().trim() === text) {
            trackUmami('text-select', {
              text: text.substring(0, 100),
              length: text.length,
            });
          }
        }, 500);
      }
    });

    document.addEventListener('copy', function() {
      const selection = window.getSelection();
      if (!selection || !isSelectionInArticle(selection)) return;
      const text = selection.toString().trim();
      if (text.length === 0) return;

      const anchorNode = selection.anchorNode;
      const anchorElement = anchorNode && anchorNode.nodeType === Node.ELEMENT_NODE
        ? anchorNode
        : anchorNode && anchorNode.parentElement;
      const isCodeBlock = !!(anchorElement && anchorElement.closest('pre, code'));

      trackUmami('text-copy', {
        text: text.substring(0, 100),
        length: text.length,
        type: isCodeBlock ? 'code' : 'text',
      });
    });
  }

  if (!runtimeFlags.articleResizeBound) {
    runtimeFlags.articleResizeBound = true;
    let articleResizeTimer = null;
    window.addEventListener('resize', function() {
      clearTimeout(articleResizeTimer);
      articleResizeTimer = setTimeout(function() {
        if (articleApi.initInlineFootnotes) articleApi.initInlineFootnotes();
        if (articleApi.initMobileHangingFigures) articleApi.initMobileHangingFigures();
      }, 120);
    });
  }

  const initMermaid = function() {
    if (!isArticlePage()) return;
    const contentRoot = document.querySelector('.gh-content');
    if (!contentRoot || contentRoot.dataset.hasMermaid !== '1') return;

    const setupMermaid = function() {
      const initializeMermaid = function(isDark) {
        window.mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          flowchart: { curve: 'basis' },
          securityLevel: 'strict',
        });
      };

      const renderDiagrams = function() {
        document.querySelectorAll('.mermaid').forEach(async function(el) {
          try {
            el.removeAttribute('data-processed');
            const content = el.getAttribute('data-content') || el.textContent || '';
            if (!content.trim()) return;
            el.textContent = content;
            await window.mermaid.run({ nodes: [el] });
            const svg = el.querySelector('svg');
            if (svg) {
              svg.style.background = 'transparent';
              svg.style.backgroundColor = 'transparent';
              const rects = svg.querySelectorAll('rect');
              rects.forEach(function(rect) {
                const isBackground = rect.classList.contains('background')
                  || (rect.getAttribute('width') === '100%' && rect.getAttribute('height') === '100%');
                if (isBackground) {
                  rect.setAttribute('fill', 'transparent');
                }
              });
            }
          } catch (e) {
            console.error('Error rendering diagram:', e);
          }
        });
      };

      const mediaQuery = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
      initializeMermaid(mediaQuery ? mediaQuery.matches : false);

      const mermaidBlocks = document.querySelectorAll(
        "pre code.language-mermaid, pre.language-mermaid, pre[data-language='mermaid'], code.language-mermaid, code[data-language='mermaid']",
      );
      mermaidBlocks.forEach(function(mermaidNode) {
        let elementToReplace = mermaidNode;
        let content = '';

        if (mermaidNode.tagName === 'PRE') {
          const code = mermaidNode.querySelector('code');
          content = code ? code.textContent.trim() : mermaidNode.textContent.trim();
          elementToReplace = mermaidNode;
        } else {
          content = mermaidNode.textContent.trim();
          const pre = mermaidNode.parentElement && mermaidNode.parentElement.tagName === 'PRE' ? mermaidNode.parentElement : null;
          elementToReplace = pre || mermaidNode;
        }

        if (!content) return;

        let blockRoot = elementToReplace;
        if (blockRoot.parentElement && blockRoot.parentElement.classList.contains('astro-code')) {
          blockRoot = blockRoot.parentElement;
        }
        const div = document.createElement('div');
        div.className = 'mermaid';
        div.setAttribute('data-content', content);
        div.textContent = content;

        const next = blockRoot.nextElementSibling
          || (blockRoot.parentElement ? blockRoot.parentElement.nextElementSibling : null);
        const captionText = next && next.tagName === 'P' ? next.textContent.trim() : '';
        const captionMatch = captionText.match(/^(?:Figure|Fig|图表|图|示意图|流程图)\s*[:：]\s*(.+)$/i);
        const figure = document.createElement('figure');
        figure.className = 'mermaid-figure';
        figure.appendChild(div);

        if (next && next.tagName === 'P' && captionMatch && captionMatch[1]) {
          const caption = document.createElement('figcaption');
          caption.textContent = captionMatch[1].trim();
          figure.appendChild(caption);
          next.remove();
        }

        blockRoot.replaceWith(figure);
      });

      renderDiagrams();

      if (mediaQuery && !mermaidThemeListener) {
        mermaidThemeListener = true;
        mediaQuery.addEventListener('change', function(e) {
          initializeMermaid(e.matches);
          renderDiagrams();
        });
      }
    };

    if (window.mermaid) {
      setupMermaid();
      return;
    }

    if (mermaidLoading) return;
    mermaidLoading = true;

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdmirror.com/npm/mermaid@10.9.3/dist/mermaid.min.js';
    script.onload = function() {
      mermaidLoading = false;
      setupMermaid();
    };
    script.onerror = function() {
      mermaidLoading = false;
    };
    document.head.appendChild(script);
  };
  articleApi.initMermaid = initMermaid;


  if (!runtimeFlags.articlePrintBound) {
    runtimeFlags.articlePrintBound = true;

    const getPrintArticleContent = function() {
      return document.querySelector('.gh-content');
    };

    const getPrintNotesTitle = function() {
      const lang = (document.documentElement.lang || 'zh-cn').toLowerCase();
      return lang.startsWith('en') ? 'Notes' : '注释';
    };

    const getPrintFigureLabel = function(index) {
      const lang = (document.documentElement.lang || 'zh-cn').toLowerCase();
      return lang.startsWith('en') ? `Figure ${index}` : `图 ${index}`;
    };

    const cleanupArticlePrintLayout = function() {
      const content = getPrintArticleContent();
      if (!content) return;

      const footnoteHeading = content.querySelector('.footnotes h2');
      if (footnoteHeading && footnoteHeading.dataset.printHeadingActive === '1') {
        footnoteHeading.innerHTML = footnoteHeading.dataset.printOriginalHtml || footnoteHeading.textContent;
        footnoteHeading.className = footnoteHeading.dataset.printOriginalClass || '';
        delete footnoteHeading.dataset.printHeadingActive;
      }

      content.querySelectorAll('figure[data-print-figure-active="1"]').forEach(function(figure) {
        figure.classList.remove('print-inline-figure');
        figure.removeAttribute('data-print-figure-active');
        figure.removeAttribute('data-print-figure-number');

        const caption = figure.querySelector('figcaption');
        if (!caption) return;

        const hangingLabel = caption.querySelector('.hanging-figure-label');
        if (hangingLabel && hangingLabel.dataset.printOriginalHtml) {
          hangingLabel.innerHTML = hangingLabel.dataset.printOriginalHtml;
          delete hangingLabel.dataset.printOriginalHtml;
        }

        const label = caption.querySelector('.print-figure-label');
        if (label) {
          label.remove();
        }

        if (caption.dataset.printGeneratedCaption === '1') {
          caption.remove();
        }
      });

      if (articleApi.initTOC) {
        articleApi.initTOC();
      }
    };

    const prepareArticlePrintLayout = function() {
      if (!isArticlePage()) return;

      const content = getPrintArticleContent();
      if (!content) return;

      cleanupArticlePrintLayout();

      const footnoteHeading = content.querySelector('.footnotes h2');
      if (footnoteHeading) {
        if (!footnoteHeading.dataset.printOriginalHtml) {
          footnoteHeading.dataset.printOriginalHtml = footnoteHeading.innerHTML;
          footnoteHeading.dataset.printOriginalClass = footnoteHeading.className;
        }
        footnoteHeading.textContent = getPrintNotesTitle();
        footnoteHeading.classList.remove('sr-only');
        footnoteHeading.dataset.printHeadingActive = '1';
      }

      const figures = Array.from(content.querySelectorAll('figure')).filter(function(figure) {
        return figure.querySelector('img')
          && !figure.classList.contains('mermaid-figure')
          && !figure.closest('.footnotes');
      });

      if (figures.length === 0) {
        if (articleApi.initTOC) {
          articleApi.initTOC();
        }
        return;
      }

      figures.forEach(function(figure, index) {
        const number = index + 1;
        const labelText = getPrintFigureLabel(number);
        let caption = figure.querySelector('figcaption');
        if (!caption) {
          caption = document.createElement('figcaption');
          caption.dataset.printGeneratedCaption = '1';
          figure.appendChild(caption);
        }

        const hangingLabel = caption.querySelector('.hanging-figure-label');
        if (hangingLabel) {
          if (!hangingLabel.dataset.printOriginalHtml) {
            hangingLabel.dataset.printOriginalHtml = hangingLabel.innerHTML;
          }
          hangingLabel.textContent = labelText;
        } else {
          const label = document.createElement('span');
          label.className = 'print-figure-label';
          label.textContent = `${labelText} `;
          caption.prepend(label);
        }

        figure.classList.add('print-inline-figure');
        figure.setAttribute('data-print-figure-active', '1');
        figure.setAttribute('data-print-figure-number', String(number));
      });

      if (articleApi.initTOC) {
        articleApi.initTOC();
      }
    };

    articleApi.preparePrintLayout = prepareArticlePrintLayout;
    articleApi.cleanupPrintLayout = cleanupArticlePrintLayout;

    window.addEventListener('beforeprint', function() {
      prepareArticlePrintLayout();
    });

    window.addEventListener('afterprint', cleanupArticlePrintLayout);

    const media = window.matchMedia?.('print');
    if (media && typeof media.addEventListener === 'function') {
      media.addEventListener('change', function(event) {
        if (event.matches) {
          prepareArticlePrintLayout();
        } else {
          cleanupArticlePrintLayout();
        }
      });
    } else if (media) {
      const legacyMedia = /** @type {any} */ (media);
      if (typeof legacyMedia.addListener === 'function') {
        legacyMedia.addListener(function(event) {
          if (event.matches) {
            prepareArticlePrintLayout();
          } else {
            cleanupArticlePrintLayout();
          }
        });
      }
    }
  }

  const initArticleRuntime = function() {
    if (!isArticlePage()) {
      cleanupTocBindings();
      if (articleApi.initInlineFootnotes) articleApi.initInlineFootnotes();
      if (articleApi.initMobileHangingFigures) articleApi.initMobileHangingFigures();
      if (articleApi.cleanupPrintLayout) articleApi.cleanupPrintLayout();
      return;
    }

    if (articleApi.initTOC) articleApi.initTOC();
    if (articleApi.initInlineFootnotes) articleApi.initInlineFootnotes();
    if (articleApi.initMobileHangingFigures) articleApi.initMobileHangingFigures();
    if (articleApi.initMermaid) articleApi.initMermaid();

    if (document.querySelector('.katex')) {
      ensureKatexStyles().catch(function() { /* CSS load failure is non-critical */ });
    }
  };
  articleApi.init = initArticleRuntime;
  return articleApi;
};
