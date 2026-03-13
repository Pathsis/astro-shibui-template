// 合并所有 DOMContentLoaded 事件到一个监听器
document.addEventListener("DOMContentLoaded", function() {
  // ========== 全局变量和检测 ==========
  const coverLeft = document.querySelector('.cover-left');
  const hasImage = coverLeft && coverLeft.querySelector('img');
  const isHome = document.body.classList.contains('home');

  // ========== 菜单切换 ==========
  // 提取为全局函数，供 View Transitions 重新调用
  window.initMenuToggle = function() {
    const menuToggle = document.querySelector('.menu-toggle');
    const overlay = document.querySelector('.menu-overlay');
    let menuScrollY = 0;

    if (menuToggle && overlay) {
      // 移除旧的事件监听器（如果有）
      const newMenuToggle = menuToggle.cloneNode(true);
      const newOverlay = overlay.cloneNode(true);
      menuToggle.parentNode.replaceChild(newMenuToggle, menuToggle);
      overlay.parentNode.replaceChild(newOverlay, overlay);

      // 重新获取引用
      const freshMenuToggle = document.querySelector('.menu-toggle');
      const freshOverlay = document.querySelector('.menu-overlay');

      // 绑定菜单按钮点击
      freshMenuToggle.addEventListener('click', function() {
        const isOpening = !document.body.classList.contains('menu-open');
        document.body.classList.toggle('menu-open');

        // 如果有图片，添加类名用于样式控制
        if (hasImage) {
          document.body.classList.toggle('menu-open-with-image');
        }

        // 移动端：菜单打开时阻止下层页面滚动
        if (window.innerWidth <= 689) {
          if (isOpening) {
            menuScrollY = window.scrollY || window.pageYOffset;
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.top = `-${menuScrollY}px`;
            document.body.style.width = '100%';
          } else {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            window.scrollTo(0, menuScrollY);
          }
        }
      });

      // 绑定遮罩层点击关闭
      freshOverlay.addEventListener('click', function() {
        document.body.classList.remove('menu-open');
        if (hasImage) {
          document.body.classList.remove('menu-open-with-image');
        }
        // 移动端：恢复滚动
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        if (window.innerWidth <= 689) {
          window.scrollTo(0, menuScrollY);
        }
      });
    }
  };

  // 初始化菜单
  window.initMenuToggle();

  // ========== TOC 目录构建 ==========
  // 提取为全局函数，供 View Transitions 重新调用
  window.initTOC = function() {
    const tocLists = document.querySelectorAll('.toc-list');
    const content = document.querySelector('main');
    if (tocLists.length === 0 || !content) return;

    const headings = content.querySelectorAll('h2, h3');

    // 过滤掉脚注标题
    const validHeadings = Array.from(headings).filter(function(heading) {
      const text = heading.textContent.trim().toLowerCase();
      return !(text === 'footnotes' || text === 'footnote' || text === '脚注' || text === '参考文献' || text === '参考');
    });

    // 如果没有有效标题，隐藏所有目录容器
    if (validHeadings.length === 0) {
      document.querySelectorAll('.toc-widget, .toc-inline').forEach(function(el) {
        el.style.display = 'none';
      });
      return;
    }

    // 为每个 TOC 列表构建内容
    tocLists.forEach(function(tocList) {
      // 清空现有内容
      tocList.innerHTML = '';

      // 创建目录项
      validHeadings.forEach(function(heading, index) {
        if (!heading.id) {
          heading.id = 'heading-' + index;
        }
        const li = document.createElement('li');
        const a = document.createElement('a');
        const level = heading.tagName.toLowerCase();
        li.className = 'toc-' + level;
        a.href = '#' + heading.id;
        a.textContent = heading.textContent;
        a.className = 'toc-link';
        li.appendChild(a);
        tocList.appendChild(li);
      });
    });

    // 目录链接点击平滑滚动
    document.querySelectorAll('.toc-link').forEach(function(link) {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').slice(1);
        const target = document.getElementById(targetId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // 移动端：关闭菜单
          if (window.innerWidth <= 689) {
            document.body.classList.remove('menu-open');
          }
        }
      });
    });

    // 滚动高亮
    const setActiveToc = function() {
      const scrollY = window.pageYOffset;
      let currentId = '';
      validHeadings.forEach(function(heading) {
        if (scrollY >= heading.offsetTop - 100) {
          currentId = heading.id;
        }
      });
      if (!currentId) return;
      document.querySelectorAll('.toc-link').forEach(function(link) {
        const isActive = link.getAttribute('href') === '#' + currentId;
        link.classList.toggle('active', isActive);
      });
    };

    if (window.__tocObserver) {
      window.__tocObserver.disconnect();
      window.__tocObserver = null;
    }
    if (window.__tocScrollHandler) {
      window.removeEventListener('scroll', window.__tocScrollHandler);
    }

    let tocTicking = false;
    window.__tocScrollHandler = function() {
      if (!tocTicking) {
        requestAnimationFrame(function() {
          setActiveToc();
          tocTicking = false;
        });
        tocTicking = true;
      }
    };
    window.addEventListener('scroll', window.__tocScrollHandler);
    setActiveToc();
  };

  // ========== 标题锚点 ==========
  window.initHeadingAnchors = function() {
    document.querySelectorAll('h2[id], h3[id], h4[id], h5[id], h6[id]').forEach(function(heading) {
      // 确保标题有锚点链接
      if (!heading.querySelector('.anchor-link')) {
        const anchor = document.createElement('a');
        anchor.href = '#' + heading.id;
        anchor.className = 'anchor-link';
        anchor.innerHTML = '#';
        anchor.setAttribute('aria-hidden', 'true');
        anchor.style.marginLeft = '0.5em';
        anchor.style.opacity = '0.3';
        anchor.style.textDecoration = 'none';
        heading.appendChild(anchor);

        // 悬停效果
        heading.addEventListener('mouseenter', function() {
          anchor.style.opacity = '1';
        });
        heading.addEventListener('mouseleave', function() {
          anchor.style.opacity = '0.3';
        });
      }
    });
  };

  // 首次加载时初始化 TOC 和锚点（非首页）
  if (!isHome) {
    window.initTOC();
    window.initHeadingAnchors();
  }

  // ========== 首页分页（Load more） ==========
  function initHomePagination(autoLoad = false) {
    const feed = document.querySelector('.shibui-feed');
    if (!feed) return;

    const loadMoreBtn = document.querySelector('.shibui-loadmore');
    let nextLink = document.querySelector('link[rel="next"]');
    let isLoading = false;

    if (!nextLink && loadMoreBtn) {
      loadMoreBtn.remove();
      return;
    }

    const sentinel = feed.nextElementSibling || loadMoreBtn || document.body;

    const loadNextPage = async () => {
      if (!nextLink || isLoading) return;
      isLoading = true;
      if (loadMoreBtn) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.setAttribute('aria-busy', 'true');
      }
      try {
        const response = await fetch(nextLink.href);
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const items = doc.querySelectorAll('.shibui-feed > *');

        const fragment = document.createDocumentFragment();
        items.forEach((item) => {
          fragment.appendChild(document.importNode(item, true));
        });
        feed.appendChild(fragment);

        const newNext = doc.querySelector('link[rel="next"]');
        if (newNext && newNext.href) {
          nextLink.href = newNext.href;
        } else {
          nextLink.remove();
          nextLink = null;
          if (loadMoreBtn) loadMoreBtn.remove();
        }
      } catch (err) {
        console.error('Load more failed:', err);
        if (loadMoreBtn) loadMoreBtn.remove();
      } finally {
        isLoading = false;
        if (loadMoreBtn && nextLink) {
          loadMoreBtn.disabled = false;
          loadMoreBtn.removeAttribute('aria-busy');
        }
      }
    };

    if (loadMoreBtn && !loadMoreBtn.dataset.loadmoreBound) {
      loadMoreBtn.dataset.loadmoreBound = '1';
      loadMoreBtn.addEventListener('click', () => {
        loadNextPage();
      });
    }

    if (autoLoad && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(async (entries) => {
        if (entries[0].isIntersecting && nextLink) {
          await loadNextPage();
        } else if (!nextLink) {
          observer.disconnect();
        }
      });
      observer.observe(sentinel);
    }
  }

  // ========== 首页分页状态持久化 ==========
  const getPaginationKey = () => `pathos_pagination_state:v3:${document.documentElement.lang || 'zh-cn'}`;

  function savePaginationState() {
    const feed = document.querySelector('.shibui-feed');
    if (!feed) return;

    const nextLink = document.querySelector('link[rel="next"]');
    const loadMoreBtn = document.querySelector('.shibui-loadmore');

    const state = {
      itemCount: feed.children.length,
      html: feed.innerHTML,
      signature: feed.getAttribute('data-pagination-signature') || '',
      path: window.location.pathname,
      nextUrl: nextLink ? nextLink.href : null,
      hasLoadMore: !!loadMoreBtn,
      scrollY: window.scrollY,
      timestamp: Date.now()
    };

    try {
      sessionStorage.setItem(getPaginationKey(), JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save pagination state:', e);
    }
  }

  function restorePaginationState() {
    try {
      const saved = sessionStorage.getItem(getPaginationKey());
      if (!saved) return false;

      const state = JSON.parse(saved);
      // 检查状态是否在5分钟内
      if (Date.now() - state.timestamp > 5 * 60 * 1000) {
        sessionStorage.removeItem(getPaginationKey());
        return false;
      }

      const feed = document.querySelector('.shibui-feed');
      if (!feed || !state.html) return false;
      const currentSignature = feed.getAttribute('data-pagination-signature') || '';
      // 部署后首页内容签名变化时，丢弃旧缓存，避免旧列表覆盖新文章。
      if (!state.signature || (currentSignature && state.signature !== currentSignature)) {
        sessionStorage.removeItem(getPaginationKey());
        return false;
      }
      if (state.path && state.path !== window.location.pathname) {
        sessionStorage.removeItem(getPaginationKey());
        return false;
      }

      // 恢复内容
      feed.innerHTML = state.html;

      // 恢复 next link
      let nextLink = document.querySelector('link[rel="next"]');
      if (state.nextUrl) {
        if (nextLink) {
          nextLink.href = state.nextUrl;
        } else {
          const l = document.createElement('link');
          l.rel = 'next';
          l.href = state.nextUrl;
          document.head.appendChild(l);
        }
      } else if (nextLink) {
        nextLink.remove();
      }

      // 恢复按钮状态
      const btn = document.querySelector('.shibui-loadmore');
      if (!state.hasLoadMore || !state.nextUrl) {
        if (btn) btn.remove();
      } else if (btn && state.nextUrl) {
        btn.setAttribute('data-next-url', state.nextUrl);
      }

      // 恢复滚动位置
      if (typeof state.scrollY === 'number') {
        window.scrollTo(0, state.scrollY);
      }

      return true;
    } catch (e) {
      console.error('Failed to restore pagination state:', e);
      return false;
    }
  }

  // 初始化分页（带持久化）
  function initHomePaginationWithPersistence(autoLoad = false) {
    // 先尝试恢复状态
    restorePaginationState();

    // 无论如何都初始化事件监听（因为恢复的只是DOM，事件需要重新绑定）
    initHomePagination(autoLoad);

    // 设置定期保存
    if (!window.__pathosPaginationScrollBound) {
      window.__pathosPaginationScrollBound = true;
      window.__pathosPaginationScrollHandler = function() {
        clearTimeout(window.paginationSaveTimeout);
        window.paginationSaveTimeout = setTimeout(savePaginationState, 300);
      };
      window.addEventListener('scroll', window.__pathosPaginationScrollHandler, { passive: true });
    }

    // 点击加载更多时保存
    const loadMoreBtn = document.querySelector('.shibui-loadmore');
    if (loadMoreBtn && !loadMoreBtn.dataset.paginationSaveBound) {
      loadMoreBtn.dataset.paginationSaveBound = '1';
      loadMoreBtn.addEventListener('click', function() {
        setTimeout(savePaginationState, 100);
      });
    }

    // 点击 site name 时重置分页
    const siteNameLinks = document.querySelectorAll('.cover-site-title a, header a[href="/"], header a[href="/en"]');
    siteNameLinks.forEach(function(link) {
      if (link.dataset.paginationResetBound) return;
      link.dataset.paginationResetBound = '1';
      link.addEventListener('click', function() {
        // 清除分页状态
        try {
          sessionStorage.removeItem(getPaginationKey());
        } catch (e) {
          console.error('Failed to clear pagination state:', e);
        }
      });
    });
  }

  if (isHome) initHomePaginationWithPersistence(false);

  // 兼容 View Transitions - 页面切换后重新初始化
  if (!window.__pathosAfterSwapBound) {
    window.__pathosAfterSwapBound = true;
    document.addEventListener('astro:after-swap', function () {
      // 重新检测首页状态
      const newIsHome = document.body.classList.contains('home');

      // 重新初始化分页（带持久化恢复）
      if (newIsHome) {
        initHomePaginationWithPersistence(false);
      }

      // 重新初始化菜单（使用 cloneNode 移除旧事件，绑定新事件）
      if (window.initMenuToggle) {
        window.initMenuToggle();
      }

      // 重新初始化 TOC 和标题锚点（非首页）
      if (!newIsHome) {
        if (window.initTOC) {
          window.initTOC();
        }
        if (window.initHeadingAnchors) {
          window.initHeadingAnchors();
        }
      }

      // 重新初始化 Mermaid / KaTeX（按需加载）
      if (window.initMermaid) {
        window.initMermaid();
      }
      if (window.initKatex) {
        window.initKatex();
      }
      if (window.initGiscus) {
        window.initGiscus();
      }

    });
  }

  // ========== Mermaid 图表渲染（按需加载） ==========
  window.initMermaid = function() {
    if (document.body.classList.contains('home')) return;
    const hasMermaid = document.querySelector(".mermaid") ||
                       document.querySelector("pre code.language-mermaid") ||
                       document.querySelector('pre[data-language="mermaid"]');
    if (!hasMermaid) return;

    const setupMermaid = () => {
      const initializeMermaid = (isDark) => {
        window.mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? "dark" : "default",
          flowchart: { curve: "basis" },
          securityLevel: "loose"
        });
      };

      const renderDiagrams = () => {
        document.querySelectorAll(".mermaid").forEach(async (el) => {
          try {
            el.removeAttribute("data-processed");
            const content = el.getAttribute("data-content") || el.textContent || "";
            if (!content.trim()) return;
            el.textContent = content;
            await window.mermaid.run({ nodes: [el] });
            const svg = el.querySelector("svg");
            if (svg) {
              svg.style.background = "transparent";
              svg.style.backgroundColor = "transparent";
              const rects = svg.querySelectorAll("rect");
              rects.forEach((rect) => {
                const isBackground = rect.classList.contains("background") ||
                  (rect.getAttribute("width") === "100%" && rect.getAttribute("height") === "100%");
                if (isBackground) {
                  rect.setAttribute("fill", "transparent");
                }
              });
            }
          } catch (e) {
            console.error("Error rendering diagram:", e);
          }
        });
      };

      const mediaQuery = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
      initializeMermaid(mediaQuery ? mediaQuery.matches : false);

      // Select mermaid code blocks from both class-based and data-language-based syntax
      const mermaidBlocks = document.querySelectorAll(
        "pre code.language-mermaid, pre.language-mermaid, pre[data-language='mermaid'], code.language-mermaid, code[data-language='mermaid']"
      );
      mermaidBlocks.forEach((mermaidNode) => {
        let elementToReplace = mermaidNode;
        let content = "";

        if (mermaidNode.tagName === "PRE") {
          const code = mermaidNode.querySelector("code");
          content = code ? code.textContent.trim() : mermaidNode.textContent.trim();
          elementToReplace = mermaidNode;
        } else {
          content = mermaidNode.textContent.trim();
          const pre = mermaidNode.parentElement && mermaidNode.parentElement.tagName === "PRE" ? mermaidNode.parentElement : null;
          elementToReplace = pre || mermaidNode;
        }

        if (!content) return;

        let blockRoot = elementToReplace;
        if (blockRoot.parentElement && blockRoot.parentElement.classList.contains("astro-code")) {
          blockRoot = blockRoot.parentElement;
        }
        const div = document.createElement("div");
        div.className = "mermaid";
        div.setAttribute("data-content", content);
        div.textContent = content;

        const next = blockRoot.nextElementSibling ||
          (blockRoot.parentElement ? blockRoot.parentElement.nextElementSibling : null);
        const captionText = next && next.tagName === "P" ? next.textContent.trim() : "";
        const captionMatch = captionText.match(/^(?:Figure|Fig|图表|图|示意图|流程图)\s*[:：]\s*(.+)$/i);
        if (next && next.tagName === "P" && captionMatch && captionMatch[1]) {
          const figure = document.createElement("figure");
          figure.className = "mermaid-figure";
          figure.appendChild(div);
          const caption = document.createElement("figcaption");
          caption.textContent = captionMatch[1].trim();
          figure.appendChild(caption);
          blockRoot.replaceWith(figure);
          next.remove();
        } else {
          blockRoot.replaceWith(div);
        }
      });

      renderDiagrams();

      if (mediaQuery && !window.__mermaidThemeListener) {
        window.__mermaidThemeListener = true;
        mediaQuery.addEventListener("change", (e) => {
          initializeMermaid(e.matches);
          renderDiagrams();
        });
      }
    };

    if (window.mermaid) {
      setupMermaid();
      return;
    }

    if (window.__mermaidLoading) return;
    window.__mermaidLoading = true;

    const script = document.createElement("script");
    script.src = "https://cdn.jsdmirror.com/npm/mermaid@10.9.3/dist/mermaid.min.js";
    script.onload = () => {
      window.__mermaidLoading = false;
      setupMermaid();
    };
    script.onerror = () => {
      window.__mermaidLoading = false;
    };
    document.head.appendChild(script);
  };

  window.initMermaid();

  // ========== KaTeX 数学公式渲染 ==========
  window.initKatex = function() {
    if (document.body.classList.contains('home')) return;
    const hasKatexElement = document.querySelector(".katex, .katex-display");
    const root = document.querySelector(".gh-content") || document.body;

    const hasMathDelimiters = () => {
      if (!root) return false;
      const filter = window.NodeFilter;
      const walker = document.createTreeWalker(root, filter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue || !node.nodeValue.trim()) return filter.FILTER_REJECT;
          const parent = node.parentElement;
          if (parent && parent.closest("code, pre, script, style, kbd, .katex, .katex-display")) {
            return filter.FILTER_REJECT;
          }
          return filter.FILTER_ACCEPT;
        }
      });
      const re = /\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(^|[^\\])\$(?!\s)([^$]*(?:[\\^_=+\-*/]|\\\\)[^$]*)\$/;
      let node;
      while ((node = walker.nextNode())) {
        if (re.test(node.nodeValue)) return true;
      }
      return false;
    };

    if (!hasKatexElement && !hasMathDelimiters()) return;

    const ensureKatexCss = () => {
      if (document.querySelector('link[href*="katex.min.css"]')) return;
      const katexCss = document.createElement("link");
      katexCss.rel = "stylesheet";
      katexCss.href = "https://cdn.jsdmirror.com/npm/katex@0.16.9/dist/katex.min.css";
      document.head.appendChild(katexCss);
    };

    const renderKatex = () => {
      renderMathInElement(document.body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\[", right: "\\]", display: true },
          { left: "\\(", right: "\\)", display: false }
        ],
        throwOnError: false
      });
    };

    ensureKatexCss();

    if (window.renderMathInElement) {
      renderKatex();
      return;
    }

    if (window.__katexLoading) return;
    window.__katexLoading = true;

    const katexScript = document.createElement("script");
    katexScript.src = "https://cdn.jsdmirror.com/npm/katex@0.16.9/dist/katex.min.js";
    katexScript.onload = () => {
      const autoRenderScript = document.createElement("script");
      autoRenderScript.src = "https://cdn.jsdmirror.com/npm/katex@0.16.9/dist/contrib/auto-render.min.js";
      autoRenderScript.onload = () => {
        window.__katexLoading = false;
        renderKatex();
      };
      document.head.appendChild(autoRenderScript);
    };
    document.head.appendChild(katexScript);
  };

  // ========== Giscus 评论渲染 ==========
  window.initGiscus = function() {
    const container = document.querySelector(".giscus-container");
    if (!container) return;

    const currentPath = window.location.pathname;
    const data = container.dataset;
    const getValue = (key, fallback) => data[key] || fallback;

    const pageLang = (document.documentElement.lang || "").toLowerCase();
    const resolvedLang = pageLang.startsWith("en") ? "en" : "zh-CN";
    container.dataset.lang = resolvedLang;
    const currentKey = `${resolvedLang}:${currentPath}`;

    const config = {
      repo: getValue("repo", ""),
      repoId: getValue("repoId", ""),
      category: getValue("category", ""),
      categoryId: getValue("categoryId", ""),
      mapping: getValue("mapping", "pathname"),
      term: currentPath,
      strict: getValue("strict", "0"),
      reactionsEnabled: getValue("reactionsEnabled", "1"),
      emitMetadata: getValue("emitMetadata", "0"),
      inputPosition: getValue("inputPosition", "top"),
      theme: getValue("theme", "preferred_color_scheme"),
      lang: resolvedLang
    };

    const iframe = container.querySelector("iframe.giscus-frame");
    const currentScript = container.querySelector('script[src*="giscus.app/client.js"]');
    if (container.dataset.giscusLoaded === currentKey && iframe) return;

    // 切换语言或路径时强制重建，避免 iframe 残留高度和状态
    if (iframe || currentScript) {
      container.innerHTML = "";
    }

    if (window.__giscusScriptLoading && window.__giscusScriptLoadingKey === currentKey) return;
    if (window.__giscusScriptLoading && window.__giscusScriptLoadingKey !== currentKey) {
      window.__giscusScriptLoading = false;
      window.__giscusScriptLoadingKey = "";
    }
    window.__giscusScriptLoading = true;
    window.__giscusScriptLoadingKey = currentKey;

    container.dataset.giscusLoaded = currentKey;
    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";

    script.setAttribute("data-repo", config.repo);
    script.setAttribute("data-repo-id", config.repoId);
    script.setAttribute("data-category", config.category);
    script.setAttribute("data-category-id", config.categoryId);
    script.setAttribute("data-mapping", config.mapping);
    script.setAttribute("data-term", config.term);
    script.setAttribute("data-strict", config.strict);
    script.setAttribute("data-reactions-enabled", config.reactionsEnabled);
    script.setAttribute("data-emit-metadata", config.emitMetadata);
    script.setAttribute("data-input-position", config.inputPosition);
    script.setAttribute("data-theme", config.theme);
    script.setAttribute("data-lang", config.lang);
    script.onload = () => {
      window.__giscusScriptLoading = false;
      window.__giscusScriptLoadingKey = "";
    };
    script.onerror = () => {
      window.__giscusScriptLoading = false;
      window.__giscusScriptLoadingKey = "";
      delete container.dataset.giscusLoaded;
    };

    container.appendChild(script);
  };

  window.initKatex();
  window.initGiscus();

  // ========== 图片懒加载 ==========
  (function () {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      }, {
        rootMargin: '50px 0px',
        threshold: 0.01
      });

      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  })();

  // ========== 外部链接新标签页打开 ==========
  (function () {
    document.querySelectorAll('a[href^="http"]').forEach(function(link) {
      if (!link.target && !link.href.includes(window.location.hostname)) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    });
  })();

  // ========== 滚动到顶部按钮 ==========
  (function () {
    const scrollTopBtn = document.querySelector('.scroll-top');
    if (!scrollTopBtn) return;

    // 显示/隐藏按钮
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        scrollTopBtn.classList.add('visible');
      } else {
        scrollTopBtn.classList.remove('visible');
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    toggleVisibility();

    // 点击滚动到顶部
    scrollTopBtn.addEventListener('click', function() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  })();

  // ========== GitHub Corners 动画优化 ==========
  (function () {
    const githubCorner = document.querySelector('.github-corner');
    if (!githubCorner) return;

    // 移动端：触摸时添加活跃状态
    githubCorner.addEventListener('touchstart', function() {
      this.classList.add('touch-active');
    });
    githubCorner.addEventListener('touchend', function() {
      this.classList.remove('touch-active');
    });
  })();

  // ========== 打印优化 ==========
  (function () {
    // 打印前显示所有懒加载图片
    window.addEventListener('beforeprint', function() {
      document.querySelectorAll('img[data-src]').forEach(img => {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      });
    });
  })();

  // ========== 性能优化：防抖函数 ==========
  window.debounce = function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // ========== 安全：防止 XSS ==========
  (function () {
    // 清理用户输入的锚点
    const hash = window.location.hash;
    if (hash) {
      const cleanHash = hash.replace(/[^a-zA-Z0-9_-]/g, '');
      if (cleanHash !== hash.slice(1)) {
        history.replaceState(window.history.state, '', '#' + cleanHash);
      }
    }
  })();
});
