import { useEffect, useMemo, useState } from "react";

const DEFAULT_PAGE_SIZE = 10;

export function usePagination(items, pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  // Reset to page 1 when data loads or changes size
  useEffect(() => {
    setPage(1);
  }, [items.length]);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  function goTo(n) {
    setPage(Math.max(1, Math.min(n, totalPages)));
  }

  return { page: safePage, setPage: goTo, totalPages, paginatedItems, pageSize };
}

export function Pagination({ page, totalPages, total, pageSize, onPage }) {
  const [input, setInput] = useState(String(page));

  useEffect(() => {
    setInput(String(page));
  }, [page]);

  if (totalPages <= 1) return null;

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  function apply() {
    const n = parseInt(input, 10);
    if (!isNaN(n)) onPage(n);
    else setInput(String(page));
  }

  return (
    <div className="pagination">
      <span className="pagination-info">
        Showing {from}–{to} of {total}
      </span>
      <div className="pagination-controls">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ← Previous
        </button>
        <span>Page</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          onBlur={apply}
          aria-label="Page number"
        />
        <span>of {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next →
        </button>
      </div>
    </div>
  );
}
