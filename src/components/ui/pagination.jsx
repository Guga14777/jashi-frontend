// src/components/ui/pagination.jsx
import React from 'react';
import './pagination.css';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 7;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        if (totalPages > 6) {
          pages.push('...');
          pages.push(totalPages);
        }
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        if (totalPages > 6) {
          pages.push('...');
        }
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const handlePageClick = (page) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const pages = generatePageNumbers();

  return (
    <nav role="navigation" aria-label="Pagination" className="pagination">
      <button
        type="button"
        className="pagination-button pagination-button--prev"
        onClick={handlePrevious}
        disabled={currentPage <= 1}
        aria-label="Go to previous page"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 12L6 8L10 4" />
        </svg>
        <span>Previous</span>
      </button>

      <div className="pagination-pages">
        {pages.map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                ...
              </span>
            );
          }

          return (
            <button
              key={page}
              type="button"
              className={`pagination-button pagination-button--page ${
                page === currentPage ? 'pagination-button--active' : ''
              }`}
              onClick={() => handlePageClick(page)}
              aria-label={`Go to page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="pagination-button pagination-button--next"
        onClick={handleNext}
        disabled={currentPage >= totalPages}
        aria-label="Go to next page"
      >
        <span>Next</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 4L10 8L6 12" />
        </svg>
      </button>
    </nav>
  );
};

export default Pagination;