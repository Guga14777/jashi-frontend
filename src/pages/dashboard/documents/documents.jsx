// ============================================================
// FILE: src/pages/dashboard/documents/documents.jsx
// 🔧 DEBUG VERSION - Heavy logging to trace scroll issues
// ============================================================

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../../store/auth-context.jsx";
import Pagination from "../../../components/ui/pagination";
import DocumentsTable from "./documents-table";
import PreviewDrawer from "./documents-modal";
import {
  ToastProvider,
  useToast,
  useDebounce,
  DocumentsAPI,
} from "./documents-shared";
import "./documents.css";

const useUrlState = () => {
  const [sp, setSp] = useSearchParams();
  
  const updateUrl = useCallback(
    (filters) => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== "" && v !== false) params.set(k, String(v));
      });
      setSp(params);
    },
    [setSp]
  );
  
  const getFilters = useCallback(
    () => ({
      search: sp.get("search") || "",
      type: sp.get("type") || "",
      status: sp.get("status") || "",
      dateFrom: sp.get("dateFrom") || "",
      dateTo: sp.get("dateTo") || "",
      page: parseInt(sp.get("page") || "1", 10),
      size: parseInt(sp.get("size") || "10", 10),
    }),
    [sp]
  );
  
  return { updateUrl, getFilters };
};

const CustomerDocumentsInner = () => {
  const { updateUrl, getFilters } = useUrlState();
  const { addToast } = useToast();
  const { token } = useAuth();

  const [documents, setDocuments] = useState([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [filters, setFilters] = useState(getFilters());
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [showPreview, setShowPreview] = useState(null);
  const [searchValue, setSearchValue] = useState(filters.search);
  const [error, setError] = useState(null);
  
  const lastFocused = useRef(null);
  const prevUrlFiltersRef = useRef();
  const isInitialMount = useRef(true);
  
  // ⭐ Ref for scroll-to-top on pagination
  const cardRef = useRef(null);
  const prevPageRef = useRef(filters.page);

  const debouncedSearch = useDebounce(searchValue, 300);
  const totalPages = Math.max(1, Math.ceil(totalDocuments / filters.size));

  // 🔧 DEBUG: Log when component mounts
  useEffect(() => {
    console.log('🔧 DEBUG: Documents component mounted');
    console.log('🔧 DEBUG: cardRef.current =', cardRef.current);
  }, []);

  // ⭐ FIXED: Scroll to top of Documents card when pagination changes
  useEffect(() => {
    console.log('🔧 DEBUG: Scroll effect triggered');
    console.log('🔧 DEBUG: prevPageRef.current =', prevPageRef.current);
    console.log('🔧 DEBUG: filters.page =', filters.page);
    console.log('🔧 DEBUG: cardRef.current =', cardRef.current);
    
    if (prevPageRef.current !== filters.page) {
      console.log('🔧 DEBUG: Page changed from', prevPageRef.current, 'to', filters.page);
      
      if (cardRef.current) {
        // Calculate absolute offset of the card
        let element = cardRef.current;
        let offsetTop = 0;
        
        console.log('🔧 DEBUG: Starting offset calculation...');
        
        while (element) {
          console.log('🔧 DEBUG: Element:', element.className || element.tagName, 'offsetTop:', element.offsetTop);
          offsetTop += element.offsetTop;
          element = element.offsetParent;
        }
        
        // Account for fixed header
        const headerOffset = 100;
        const targetScroll = Math.max(0, offsetTop - headerOffset);
        
        console.log('🔧 DEBUG: Total offsetTop =', offsetTop);
        console.log('🔧 DEBUG: headerOffset =', headerOffset);
        console.log('🔧 DEBUG: targetScroll =', targetScroll);
        console.log('🔧 DEBUG: Current scroll position =', window.scrollY);
        
        // Scroll to top of card
        window.scrollTo(0, targetScroll);
        document.documentElement.scrollTop = targetScroll;
        document.body.scrollTop = targetScroll;
        
        console.log('🔧 DEBUG: After scroll, window.scrollY =', window.scrollY);
      } else {
        console.log('🔧 DEBUG: ❌ cardRef.current is NULL - ref not attached!');
      }
    } else {
      console.log('🔧 DEBUG: Page did not change, skipping scroll');
    }
    
    prevPageRef.current = filters.page;
  }, [filters.page]);

  const fetchDocuments = useCallback(async (fp, keepPreviousData = false) => {
    if (!token) {
      console.warn('⚠️ No auth token, skipping document fetch');
      setIsLoading(false);
      return;
    }

    if (!keepPreviousData) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const res = await DocumentsAPI.fetchDocuments(fp, token);
      setDocuments(res.documents || []);
      setTotalDocuments(res.total || 0);
    } catch (err) {
      console.error("❌ Failed to fetch documents:", err);
      setError(err.message || "Failed to fetch documents");
      addToast("Failed to fetch documents", "error");
      if (!keepPreviousData) {
        setDocuments([]);
        setTotalDocuments(0);
      }
    } finally {
      setIsLoading(false);
      setHasInitiallyLoaded(true);
    }
  }, [token, addToast]);

  const updateFilters = useCallback(
    (newFilters) => {
      const updated = { ...filters, ...newFilters, page: 1 };
      setFilters(updated);
      updateUrl(updated);
    },
    [filters, updateUrl]
  );

  const updateFiltersWithPage = useCallback(
    (newFilters) => {
      const updated = { ...filters, ...newFilters };
      setFilters(updated);
      updateUrl(updated);
    },
    [filters, updateUrl]
  );

  useEffect(() => {
    if (isInitialMount.current || debouncedSearch === filters.search) return;
    updateFilters({ search: debouncedSearch });
  }, [debouncedSearch, filters.search, updateFilters]);

  useEffect(() => {
    if (!token) return;
    const isPageChange = filters.page > 1;
    fetchDocuments(filters, isPageChange);
  }, [filters, token, fetchDocuments]);

  useEffect(() => {
    const urlFilters = getFilters();
    const urlFiltersStr = JSON.stringify(urlFilters);
    if (prevUrlFiltersRef.current !== urlFiltersStr) {
      prevUrlFiltersRef.current = urlFiltersStr;
      if (!isInitialMount.current) {
        setFilters(urlFilters);
        setSearchValue(urlFilters.search);
      }
    }
    isInitialMount.current = false;
  }, [getFilters]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && showPreview) setShowPreview(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showPreview]);

  const handlePreview = useCallback((arg1, maybeDoc) => {
    let doc = arg1;
    if (arg1 && typeof arg1 === "object" && "preventDefault" in arg1) {
      arg1.preventDefault?.();
      arg1.stopPropagation?.();
      doc = maybeDoc;
    }
    if (!doc) return;
    lastFocused.current = document.activeElement;
    setShowPreview(doc);
  }, []);

  const handleDownload = useCallback(async (doc) => {
    if (!token) {
      addToast("Please log in to download documents", "error");
      return;
    }
    try {
      await DocumentsAPI.downloadDocument(doc.id, token, doc.name || doc.originalName);
      addToast(`${doc.name || doc.originalName} downloaded!`, "success");
    } catch (err) {
      console.error("Download failed:", err);
      addToast("Download failed", "error");
    }
  }, [token, addToast]);

  const handleClosePreview = useCallback(() => {
    setShowPreview(null);
    setTimeout(() => { lastFocused.current?.focus?.(); }, 100);
  }, []);

  // ⭐ Handle page change
  const handlePageChange = useCallback((page) => {
    console.log(`📄 Documents: Page changed to ${page}`);
    console.log('🔧 DEBUG: handlePageChange called with page:', page);
    updateFiltersWithPage({ page });
  }, [updateFiltersWithPage]);

  return (
    <div className="documents-page" role="main" ref={cardRef}>
      <header className="documents-header">
        <h1>Documents</h1>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <span>Dashboard</span>
          <span className="separator" aria-hidden="true">→</span>
          <span aria-current="page">Documents</span>
        </nav>
      </header>

      <div className="documents-content">
        {error && (
          <div className="documents-error" role="alert">
            <p>{error}</p>
            <button onClick={() => fetchDocuments(filters)} className="btn btn-secondary">
              Retry
            </button>
          </div>
        )}

        <DocumentsTable
          documents={documents}
          isLoading={isLoading}
          totalDocuments={totalDocuments}
          onPreview={handlePreview}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
        />

        {!isLoading && documents.length > 0 && totalPages > 1 && (
          <Pagination
            currentPage={filters.page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            ariaLabel="Documents pagination"
          />
        )}
      </div>

      {showPreview && (
        <PreviewDrawer
          document={showPreview}
          onClose={handleClosePreview}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
};

const DocumentsPageWithProviders = () => (
  <ToastProvider>
    <CustomerDocumentsInner />
  </ToastProvider>
);

export default DocumentsPageWithProviders;