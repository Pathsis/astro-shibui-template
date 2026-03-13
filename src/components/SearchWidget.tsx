import { useState, useCallback, useEffect, useRef, useMemo } from "preact/hooks";
import { liteClient } from "algoliasearch/lite";
import styles from "./SearchWidget.module.css";

interface Props {
  lang: "zh-cn" | "en";
  appId: string;
  searchKey: string;
  indexName: string;
}

interface SearchHit {
  objectID: string;
  title: string;
  url: string;
  content: string;
  language?: string;
  _highlightResult?: {
    title?: { value: string };
    content?: { value: string };
  };
  _snippetResult?: {
    content?: { value: string };
  };
}

export default function SearchWidget({ lang, appId, searchKey, indexName }: Props) {
  const FOCUS_KEY = "pathos-search-focus-once";
  const SEARCH_HISTORY_KEY = "__pathosSearchUi";
  const [showShortcutHint, setShowShortcutHint] = useState(true);
  const [shortcutPrimaryKey, setShortcutPrimaryKey] = useState("Ctrl");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const isComposingRef = useRef(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const restoreFocusedIndexRef = useRef<number | null>(null);
  const restoreScrollTopRef = useRef<number | null>(null);

  // 使用 useMemo 稳定 client 引用，避免每次渲染都重新创建
  const client = useMemo(() => liteClient(appId, searchKey), [appId, searchKey]);

  const isZhCn = lang === "zh-cn";
  const placeholderBase = isZhCn ? "搜索文章" : "Search articles";
  const placeholder = placeholderBase;
  const searchingText = isZhCn ? "搜索中..." : "Searching...";
  const noResultsText = isZhCn 
    ? '没有找到包含 "{query}" 的文章' 
    : 'No articles found containing "{query}"';
  const clearLabel = isZhCn ? "清除搜索" : "Clear search";
  const selectHintText = isZhCn ? "选择" : "Select";
  const openHintText = isZhCn ? "打开" : "Open";
  const backHintText = isZhCn ? "返回" : "Back";

  // 防抖搜索
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      try {
        const { results } = await client.search<SearchHit>({
          requests: [
            {
              indexName,
              query: searchQuery,
              hitsPerPage: 10,
              filters: `language:${lang}`,
              attributesToRetrieve: ["title", "url", "language"],
              attributesToHighlight: ["title", "content"],
              attributesToSnippet: ["content:30"],
              highlightPreTag: '<em class="highlight">',
              highlightPostTag: "</em>",
            },
          ],
        });

        const firstResult = results[0] as { hits?: SearchHit[] } | undefined;
        const hits = Array.isArray(firstResult?.hits) ? firstResult.hits : [];

        // 去重：基于 objectID
        const languageFilteredHits = hits.filter((hit: SearchHit) => !hit.language || hit.language === lang);

        const uniqueHits = languageFilteredHits.filter((hit: SearchHit, index: number, self: SearchHit[]) =>
          index === self.findIndex((candidate: SearchHit) => candidate.objectID === hit.objectID)
        );

        setResults(uniqueHits);
        setFocusedIndex(-1);
        setShowResults(true);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [lang, client, indexName]
  );

  const performSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowResults(false);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    debouncedSearch(searchQuery);
  };

  const persistReturnSearchState = useCallback((nextFocusedIndex?: number) => {
    if (typeof window === "undefined") return;
    if (!query.trim()) return;
    try {
      const baseState =
        window.history.state && typeof window.history.state === "object"
          ? window.history.state
          : {};
      const payload = {
        query,
        focusedIndex: nextFocusedIndex ?? focusedIndex,
        scrollTop: resultsRef.current?.scrollTop ?? 0,
        results,
        ts: Date.now(),
      };
      window.history.replaceState(
        {
          ...baseState,
          [SEARCH_HISTORY_KEY]: payload,
        },
        ""
      );
    } catch {
      // ignore history state errors
    }
  }, [query, focusedIndex, results]);

  // 使用原生 DOM 事件监听器处理 IME
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleInput = (e: Event) => {
      const value = (e.target as HTMLInputElement).value;
      setQuery(value);
      // 非 composing 状态下，需要手动触发清除按钮更新
      if (!isComposingRef.current && value.trim()) {
        // 不在这里搜索，等待 debounce 或 compositionEnd
      } else if (!value.trim()) {
        setResults([]);
        setShowResults(false);
      }
    };

    const debouncedInputHandler = debounce(() => {
      if (!isComposingRef.current && input.value.trim()) {
        performSearch(input.value);
      }
    }, 300);

    const handleCompositionStart = () => {
      isComposingRef.current = true;
    };

    const handleCompositionEnd = () => {
      isComposingRef.current = false;
      if (input.value.trim()) {
        performSearch(input.value);
      }
    };

    input.addEventListener("input", handleInput);
    input.addEventListener("input", debouncedInputHandler);
    input.addEventListener("compositionstart", handleCompositionStart);
    input.addEventListener("compositionend", handleCompositionEnd);

    return () => {
      input.removeEventListener("input", handleInput);
      input.removeEventListener("input", debouncedInputHandler);
      input.removeEventListener("compositionstart", handleCompositionStart);
      input.removeEventListener("compositionend", handleCompositionEnd);
    };
  }, []);

  // 更新 URL
  useEffect(() => {
    const url = new URL(window.location.href);
    if (query.trim()) {
      url.searchParams.set("q", query);
    } else {
      url.searchParams.delete("q");
    }
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl !== currentUrl) {
      history.replaceState(window.history.state, "", nextUrl);
    }
  }, [query]);

  // 恢复搜索状态
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get("q");

    // 优先恢复 history.state（从结果页返回时体验最平滑）。
    try {
      const historyState =
        window.history.state && typeof window.history.state === "object"
          ? window.history.state
          : null;
      const restored = historyState?.[SEARCH_HISTORY_KEY] as
        | {
            query?: string;
            focusedIndex?: number;
            scrollTop?: number;
            ts?: number;
            results?: SearchHit[];
          }
        | undefined;
      if (restored?.query?.trim()) {
        // 最长保留 2 小时，避免跨天误恢复。
        if (typeof restored.ts !== "number" || Date.now() - restored.ts <= 2 * 60 * 60 * 1000) {
          setQuery(restored.query);
          const restoredResults = Array.isArray(restored.results) ? restored.results : [];
          if (restoredResults.length > 0) {
            setResults(restoredResults);
            setShowResults(true);
            setIsLoading(false);
          } else {
            performSearch(restored.query);
          }
          if (typeof restored.focusedIndex === "number") {
            restoreFocusedIndexRef.current = restored.focusedIndex;
          }
          if (typeof restored.scrollTop === "number") {
            restoreScrollTopRef.current = restored.scrollTop;
          }
          return;
        }
      }
    } catch {
      // ignore history parsing errors
    }

    if (searchQuery) {
      setQuery(searchQuery);
      performSearch(searchQuery);
    }
  }, []);

  useEffect(() => {
    if (!showResults || results.length === 0) return;
    const container = resultsRef.current;
    if (!container) return;
    if (restoreFocusedIndexRef.current != null) {
      const next = Math.min(Math.max(restoreFocusedIndexRef.current, -1), results.length - 1);
      setFocusedIndex(next);
      restoreFocusedIndexRef.current = null;
    }
    if (restoreScrollTopRef.current != null) {
      container.scrollTop = Math.max(restoreScrollTopRef.current, 0);
      restoreScrollTopRef.current = null;
    }
  }, [results, showResults]);

  // 移动视图下隐藏快捷键提示（平板与桌面显示）
  useEffect(() => {
    if (typeof window === "undefined") return;
    const widthQuery = window.matchMedia("(max-width: 640px)");
    const updateShortcutHint = () => {
      setShowShortcutHint(!widthQuery.matches);
    };
    updateShortcutHint();
    widthQuery.addEventListener("change", updateShortcutHint);
    return () => {
      widthQuery.removeEventListener("change", updateShortcutHint);
    };
  }, []);

  // 键盘选择时自动滚动到当前高亮项
  useEffect(() => {
    if (!showResults || focusedIndex < 0) return;
    const container = resultsRef.current;
    if (!container) return;
    const item = container.querySelector(`[data-index="${focusedIndex}"]`);
    if (!(item instanceof HTMLElement)) return;
    item.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedIndex, showResults]);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const platform = navigator.platform || navigator.userAgent || "";
    const isAppleDevice = /Mac|iPhone|iPad|iPod/i.test(platform);
    setShortcutPrimaryKey(isAppleDevice ? "⌘" : "Ctrl");
  }, []);

  // 响应快捷键请求聚焦搜索框（同页触发 + 跨页一次性标记）
  useEffect(() => {
    const focusInput = () => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      if (input.value.trim()) {
        setShowResults(true);
      }
    };

    const handleFocusRequest = () => {
      window.requestAnimationFrame(focusInput);
    };

    window.addEventListener("pathos:focus-search", handleFocusRequest as EventListener);

    try {
      if (window.sessionStorage.getItem(FOCUS_KEY) === "1") {
        window.sessionStorage.removeItem(FOCUS_KEY);
        handleFocusRequest();
      }
    } catch {
      // ignore storage errors
    }

    return () => {
      window.removeEventListener("pathos:focus-search", handleFocusRequest as EventListener);
    };
  }, []);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };

    if (showResults) {
      document.addEventListener("click", handleClickOutside);
      document.documentElement.classList.add("search-scroll-locked");
      document.body.classList.add("search-scroll-locked");
    } else {
      document.documentElement.classList.remove("search-scroll-locked");
      document.body.classList.remove("search-scroll-locked");
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.documentElement.classList.remove("search-scroll-locked");
      document.body.classList.remove("search-scroll-locked");
    };
  }, [showResults]);

  // 键盘导航
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!showResults) return;
    
    switch (e.key) {
      case "Enter":
        e.preventDefault();
        if (!isComposingRef.current && focusedIndex >= 0 && results[focusedIndex]) {
          persistReturnSearchState(focusedIndex);
          window.location.href = results[focusedIndex].url;
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case "Escape":
        setShowResults(false);
        inputRef.current?.blur();
        break;
    }
  };

const clearSearch = () => {
  setQuery("");
  setResults([]);
  setShowResults(false);
  inputRef.current?.focus();
};

const handleMouseMove = () => {
  setFocusedIndex(-1);
};

  const showNavigationHint = showShortcutHint && showResults && !isLoading && results.length > 0;
  const showOpenHint = showShortcutHint && !showNavigationHint;

  return (
    <div 
      ref={widgetRef}
      class={`${styles.searchWidget} ${showResults ? styles.hasResults : ""}`}
    >
      <div class={styles.searchBox}>
        <input
          ref={inputRef}
          data-search-input="true"
          type="text"
          value={query}
          onInput={(e) => {
            // 只更新 query，不触发搜索（由原生监听器处理）
            setQuery((e.target as HTMLInputElement).value);
          }}
          onFocus={() => {
            if (query.trim()) {
              setShowResults(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          class={styles.searchInput}
          autocomplete="off"
        />
        <span class={styles.searchIcon} aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </span>
        <button
          onClick={clearSearch}
          class={`${styles.clearSearch} ${query ? styles.visible : ""} ${(showNavigationHint || showOpenHint) ? styles.hiddenForHint : ""}`}
          aria-label={clearLabel}
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div
          class={`${styles.keyboardHint} ${(showNavigationHint || showOpenHint) ? styles.visible : ""}`}
          aria-hidden="true"
        >
          {showNavigationHint ? (
            <>
              <span class={styles.inlineHintGroup}>
                <span class={styles.keycap}>↑</span>
                <span class={styles.keycap}>↓</span>
                <span class={styles.inlineHintText}>{selectHintText}</span>
              </span>
              <span class={styles.inlineHintGroup}>
                <span class={styles.keycap}>Enter</span>
                <span class={styles.inlineHintText}>{openHintText}</span>
              </span>
              <span class={styles.inlineHintGroup}>
                <span class={styles.keycap}>Esc</span>
                <span class={styles.inlineHintText}>{backHintText}</span>
              </span>
            </>
          ) : (
            <>
              <span class={styles.keycap}>{shortcutPrimaryKey}</span>
              <span class={styles.keycap}>K</span>
            </>
          )}
        </div>
      </div>

      <div 
        ref={resultsRef}
        class={`${styles.searchResults} ${showResults ? styles.visible : ""}`}
        role="listbox"
        aria-live="polite"
        onMouseMove={handleMouseMove}
      >
        {isLoading ? (
          <div class={`${styles.loading} ${styles.visible}`}>{searchingText}</div>
        ) : results.length > 0 ? (
          results.map((hit, index) => (
            <div
              key={hit.objectID}
              class={`${styles.searchResultItem} ${index === focusedIndex ? styles.focused : ""}`}
              role="option"
              tabindex={0}
              data-index={index}
              onMouseEnter={() => setFocusedIndex(index)}
            >
              <a
                href={hit.url}
                tabindex={-1}
                onClick={() => persistReturnSearchState(index)}
              >
                <h1
                  dangerouslySetInnerHTML={{
                    __html: hit._highlightResult?.title?.value || escapeHtml(hit.title),
                  }}
                />
                <p
                  dangerouslySetInnerHTML={{
                    __html: hit._snippetResult?.content?.value || "",
                  }}
                />
              </a>
            </div>
          ))
        ) : query ? (
          <div class={styles.noResults}>
            {noResultsText.replace("{query}", escapeHtml(query))}
          </div>
        ) : null}

      </div>
    </div>
  );
}

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (m) => 
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m] || m)
  );
}
