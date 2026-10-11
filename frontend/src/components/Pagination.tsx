import React from 'react';

interface PaginationProps {
  page: number; // 0-indexed page from Spring Page
  totalPages: number;
  totalElements?: number;
  onPageChange: (newPage: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  totalElements,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const currentPage = page; // 0-indexed
  const humanPage = currentPage + 1; // 1-indexed for display

  // Calculate pages to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      if (currentPage > 2) pages.push('...');
      
      const start = Math.max(1, currentPage - 1);
      const end = Math.min(totalPages - 2, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 3) pages.push('...');
      if (!pages.includes(totalPages - 1)) pages.push(totalPages - 1);
    }

    return pages;
  };

  return (
    <nav className="pagination-container" aria-label="Pagination">
      {totalElements !== undefined && (
        <span className="pagination-info text-sm text-muted">
          Showing page {humanPage} of {totalPages} ({totalElements} total)
        </span>
      )}

      <ul className="pagination-list">
        <li>
          <button
            type="button"
            className="pagination-btn"
            disabled={currentPage === 0}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Previous Page"
          >
            ← Prev
          </button>
        </li>

        {getPageNumbers().map((p, idx) => {
          if (p === '...') {
            return (
              <li key={`ellipsis-${idx}`} className="pagination-ellipsis">
                …
              </li>
            );
          }

          const pageNum = p as number;
          const isActive = pageNum === currentPage;

          return (
            <li key={pageNum}>
              <button
                type="button"
                className={`pagination-btn ${isActive ? 'active' : ''}`}
                onClick={() => onPageChange(pageNum)}
                aria-current={isActive ? 'page' : undefined}
              >
                {pageNum + 1}
              </button>
            </li>
          );
        })}

        <li>
          <button
            type="button"
            className="pagination-btn"
            disabled={currentPage >= totalPages - 1}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Next Page"
          >
            Next →
          </button>
        </li>
      </ul>
    </nav>
  );
};
