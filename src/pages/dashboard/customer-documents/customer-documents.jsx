// src/pages/dashboard/customer-documents/customer-documents.jsx
// ✅ FIXED: Removed duplicate footer
// ✅ FIXED: Pagination scrolls to top of TABLE (not page)
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useCustomerDocs } from './hooks/use-customer-docs';
import CustomerDocumentsFilters from './components/filters';
import DocumentsTable from './components/documents-table';
import DocumentModal from './components/document-modal';
import Pagination from '../../../components/ui/pagination';
import { useDebounce } from '../../../hooks/use-debounce';
import LiveChat from '../../../components/live-chat/live-chat.jsx';
import './customer-documents.css';

const DEBOUNCE_DELAY = 300;
const ITEMS_PER_PAGE = 10;

const useAnalytics = () => ({
  track: (eventName, properties) => {
    console.log('Analytics:', eventName, properties);
  }
});

export const CustomerDocuments = () => {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [lastFocusedElement, setLastFocusedElement] = useState(null);
  
  const resizeObserverRef = useRef(null);
  const { track } = useAnalytics();
  
  // ⭐ Ref for scroll-to-top on pagination - points to TABLE section
  const tableRef = useRef(null);
  const prevPageRef = useRef(currentPage);

  useEffect(() => {
    const setHeaderVar = () => {
      const header =
        document.querySelector('[data-app-header]') ||
        document.querySelector('.app-header') ||
        document.querySelector('header');
      
      if (header) {
        const h = header.getBoundingClientRect().height || 96;
        document.documentElement.style.setProperty('--app-header-height', `${Math.ceil(h)}px`);
      }
    };

    setHeaderVar();

    if (window.ResizeObserver) {
      const header = document.querySelector('[data-app-header]') || 
                    document.querySelector('.app-header') || 
                    document.querySelector('header');
      
      if (header) {
        resizeObserverRef.current = new ResizeObserver(() => {
          setHeaderVar();
        });
        resizeObserverRef.current.observe(header);
      }
    } else {
      window.addEventListener('resize', setHeaderVar);
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      } else {
        window.removeEventListener('resize', setHeaderVar);
      }
    };
  }, []);

  // ⭐ FIXED: Scroll to top of TABLE when pagination changes
  // This makes the table header visible at the top of the viewport
  useEffect(() => {
    if (prevPageRef.current !== currentPage && tableRef.current) {
      // Calculate absolute offset of the table section
      let element = tableRef.current;
      let offsetTop = 0;
      
      while (element) {
        offsetTop += element.offsetTop;
        element = element.offsetParent;
      }
      
      // Account for fixed header (adjust this value if needed)
      const headerOffset = 100;
      const targetScroll = Math.max(0, offsetTop - headerOffset);
      
      // Scroll to top of table
      window.scrollTo(0, targetScroll);
      document.documentElement.scrollTop = targetScroll;
      document.body.scrollTop = targetScroll;
    }
    
    prevPageRef.current = currentPage;
  }, [currentPage]);

  const debouncedQuery = useDebounce(query, DEBOUNCE_DELAY);
  
  const {
    items: documents = [],
    totalItems: totalCount = 0,
    totalPages: hookTotalPages = 1,
    isLoading,
    error,
    refetch
  } = useCustomerDocs({
    query: debouncedQuery,
    type,
    status,
    page: currentPage,
    limit: ITEMS_PER_PAGE
  });

  const totalPages = hookTotalPages;

  const handleFilterChange = useCallback((filters) => {
    const newQuery = filters.search ?? query;
    const newType = filters.type ?? type;
    const newStatus = filters.status ?? status;
    
    const hasChanges = newQuery !== query || newType !== type || newStatus !== status;

    if (hasChanges) {
      setQuery(newQuery);
      setType(newType);
      setStatus(newStatus);
      setCurrentPage(1);
      
      track('documents_filter_applied', { 
        filters: { search: newQuery, type: newType, status: newStatus }
      });
    }
  }, [query, type, status, track]);

  useEffect(() => {
    if (debouncedQuery !== query && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [debouncedQuery, query, currentPage]);

  const handlePageChange = useCallback((newPage) => {
    const previousPage = currentPage;
    setCurrentPage(newPage);
    track('documents_page_changed', {
      from: previousPage,
      to: newPage,
      totalPages
    });
  }, [currentPage, totalPages, track]);

  const handleDocumentOpen = useCallback((doc, element) => {
    setLastFocusedElement(element);
    setSelectedDoc(doc);
    document.body.style.overflow = 'hidden';
    
    track('documents_row_viewed', {
      documentId: doc.id,
      documentType: doc.type,
      status: doc.status
    });
  }, [track]);

  const handleModalClose = useCallback(() => {
    setSelectedDoc(null);
    document.body.style.overflow = '';
    
    if (lastFocusedElement) {
      lastFocusedElement.focus();
      setLastFocusedElement(null);
    }
  }, [lastFocusedElement]);

  const handleRetry = useCallback(() => refetch(), [refetch]);

  const handleClearFilters = useCallback(() => {
    setQuery('');
    setType('');
    setStatus('');
    setCurrentPage(1);
    track('documents_filters_cleared');
  }, [track]);

  useEffect(() => {
    if (debouncedQuery) {
      track('documents_search_applied', { query: debouncedQuery });
    }
  }, [debouncedQuery, track]);

  const hasActiveFilters = !!(query || type || status);

  return (
    <>
      <main className="custdocs-page" role="main">
        <div className="custdocs-container">
          
          <header className="custdocs-header">
            <div className="page-title-section">
              <h1 className="page-title">Documents</h1>
            </div>
          </header>

          <div className="filters-container">
            <CustomerDocumentsFilters
              value={query}
              onChange={handleFilterChange}
              type={type}
              status={status}
              isLoading={isLoading}
            />
            
            {hasActiveFilters && (
              <button 
                onClick={handleClearFilters}
                className="btn btn-outline clear-filters-btn"
                aria-label="Clear all filters"
              >
                Clear filters
              </button>
            )}
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <div className="alert-content">
                <div className="alert-title">
                  <strong>Unable to load documents</strong>
                </div>
                <p className="alert-message">
                  There was a problem loading your documents. Please try again.
                </p>
                <button onClick={handleRetry} className="error-retry-btn">
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* ⭐ TABLE SECTION - ref points here for scroll target */}
          <section className="custdocs-content" aria-label="Documents list" ref={tableRef}>
            <DocumentsTable
              items={documents}
              isLoading={isLoading && documents.length === 0}
              onOpen={handleDocumentOpen}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={handleClearFilters}
              emptyState={{
                show: !isLoading && documents.length === 0,
                title: hasActiveFilters 
                  ? "No documents match your filters" 
                  : "No documents available",
                message: hasActiveFilters
                  ? "Try adjusting your filters or clearing them to see all documents."
                  : "Documents will appear here once they become available.",
                action: hasActiveFilters ? {
                  label: "Clear all filters",
                  onClick: handleClearFilters
                } : null
              }}
            />
          </section>

          {totalPages > 1 && (
            <nav className="custdocs-midpager" aria-label="Documents pagination">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </nav>
          )}
        </div>

        {selectedDoc && (
          <DocumentModal 
            doc={selectedDoc} 
            onClose={handleModalClose}
            aria-labelledby="document-modal-title"
          />
        )}
      </main>
      {/* Footer removed - handled by layout wrapper */}
      <LiveChat />
    </>
  );
};

export default CustomerDocuments;