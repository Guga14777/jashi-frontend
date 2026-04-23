import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Copy, Check, AlertCircle } from "lucide-react";
import TxDetailsModal from "./tx-details-modal/tx-details-modal.jsx";
import { formatDate as fmtDate, formatCurrency as fmtCurrency } from "../../../../utils/formatters.js";
import { getPaymentMethodCapabilities, validateRefundEligibility } from "../../../../utils/payments-mock.js";
import { normalizeTransactionStatusByType } from "../../../../utils/helpers.js";
import "./transactions.css";
import "./tx-details-modal/tx-details-modal.css";

// Enhanced message map for internationalization with simplified payment methods
const MESSAGES = {
  title: "Transaction History",
  searchPlaceholder: "Search description or invoice #",
  clearSearch: "Clear search",
  fromDate: "From",
  toDate: "To",
  allTypes: "All",
  allStatuses: "All",
  clearFilters: "Clear",
  resetFilters: "Reset filters",
  noTransactionsTitle: "No transactions found",
  noTransactionsDescription: "Try adjusting your search criteria or date range.",
  dateError: "End date must be on or after start date.",
  viewDetails: "View Details",
  transactionDetails: "Transaction Details",
  close: "Close",
  copy: "Copy",
  copied: "Copied",
  receiptNote: "If you need a receipt, contact support.",
  dateNewestFirst: "Sorted by date, newest first",
  dateOldestFirst: "Sorted by date, oldest first",
  filtersActive: "Filters:",
  loading: "Loading transactions...",
  error: "Failed to load transactions",
  refundInfo: "Refund Information",
  refundEligible: "This transaction is eligible for refund",
  refundNotEligible: "This transaction cannot be refunded",
  refundAlreadyProcessed: "Already refunded",
  requestRefund: "Request Refund",
  fields: {
    date: "Date",
    description: "Description",
    type: "Type",
    method: "Method",
    status: "Status",
    amount: "Amount",
    action: "Action",
    transactionId: "Transaction ID",
    dateTime: "Date & Time",
    reference: "Reference",
    refundStatus: "Refund Status",
    bankRef: "Bank Reference",
    checkNo: "Check Number",
    recipient: "Recipient",
    pickupLocation: "Pickup Location",
    clerkId: "Clerk ID",
    disputeReason: "Dispute Reason",
    failureCode: "Failure Code",
    lastFour: "Card Last 4"
  },
  types: {
    credit_card: "Credit Card",
    debit_card: "Debit Card",
    bank_transfer: "Bank Transfer (ACH/Wire)",
    check: "Check",
    cash: "Cash",
    digital: "Digital Transfer"
  },
  statuses: {
    paid: "Paid",
    posted: "Posted",
    pending: "Pending",
    processing: "Processing",
    in_transit: "In Transit",
    failed: "Failed",
    refunded: "Refunded",
    partial_refund: "Partial Refund",
    disputed: "Disputed",
    dispute_open: "Dispute Open",
    dispute_won: "Dispute Won", 
    dispute_lost: "Dispute Lost",
    chargeback: "Chargeback",
    voided: "Voided",
    cancelled: "Cancelled",
    reversed: "Reversed",
    sent: "Sent",
    released: "Released"
  },
  refundReasons: {
    digitalTransfer: "Digital transfers (Zelle, Cash App) cannot be refunded due to instant processing",
    wireTransfer: "Wire transfers are typically non-refundable due to immediate settlement",
    cashTransaction: "Cash transactions cannot be refunded electronically",
    alreadyRefunded: "This transaction has already been refunded",
    notPaid: "Only completed transactions can be refunded",
    timeExpired: "Refund period has expired",
    disputed: "Cannot refund disputed transactions"
  }
};

export default function Transactions({ 
  transactions = [], 
  loading = false, 
  error = null,
  onDownloadInvoice = null,
  onRequestRefund = null
}) {
  const [filters, setFilters] = useState(() => {
    // Restore filters from sessionStorage with SSR guard
    const saved = typeof window !== "undefined" ? sessionStorage.getItem('tx-filters') : null;
    return saved ? JSON.parse(saved) : {
      search: "",
      dateFrom: "",
      dateTo: "",
      type: "all",
      status: "all",
    };
  });
  
  // Pagination state
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  const [dateError, setDateError] = useState("");
  const [liveMessage, setLiveMessage] = useState("");
  const [copiedField, setCopiedField] = useState("");

  // Reset to page 1 when filters/search/sort change
  useEffect(() => { 
    setPage(1); 
  }, [debouncedSearch, filters, sortOrder, dateError]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 250);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Persist filters to sessionStorage with SSR guard
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem('tx-filters', JSON.stringify(filters));
    }
  }, [filters]);

  // Validate date range and normalize to midnight boundaries
  useEffect(() => {
    if (filters.dateFrom && filters.dateTo) {
      const fromDate = new Date(filters.dateFrom + 'T00:00:00');
      const toDate = new Date(filters.dateTo + 'T23:59:59');
      if (toDate < fromDate) {
        setDateError(MESSAGES.dateError);
      } else {
        setDateError("");
      }
    } else {
      setDateError("");
    }
  }, [filters.dateFrom, filters.dateTo]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && filters.search) {
        handleFilterChange('search', '');
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filters.search]);

  const formatDate = (d) => fmtDate(d) || "—";

  const formatAmount = (amount, isRefund = false) => {
    const n = Number(amount ?? 0);
    const formatted = fmtCurrency(Math.abs(n));
    return (isRefund || n < 0) ? `–${formatted}` : formatted;
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      paid: "tx-badge tx-badge--paid",
      posted: "tx-badge tx-badge--paid",
      pending: "tx-badge tx-badge--pending",
      processing: "tx-badge tx-badge--processing",
      in_transit: "tx-badge tx-badge--in-transit",
      sent: "tx-badge tx-badge--in-transit",
      released: "tx-badge tx-badge--in-transit",
      failed: "tx-badge tx-badge--failed",
      refunded: "tx-badge tx-badge--refunded",
      partial_refund: "tx-badge tx-badge--refunded",
      disputed: "tx-badge tx-badge--disputed",
      dispute_open: "tx-badge tx-badge--disputed",
      dispute_won: "tx-badge tx-badge--dispute-won",
      dispute_lost: "tx-badge tx-badge--dispute-lost",
      chargeback: "tx-badge tx-badge--disputed",
      voided: "tx-badge tx-badge--voided",
      cancelled: "tx-badge tx-badge--cancelled",
      reversed: "tx-badge tx-badge--reversed",
    };
    
    const displayStatus = MESSAGES.statuses[status] || String(status ?? "").trim() || "—";
    
    return (
      <span className={statusClasses[status] || "tx-badge"}>
        {displayStatus}
      </span>
    );
  };

  const getTypeLabel = (type) => {
    return MESSAGES.types[type] || String(type ?? "").trim() || "—";
  };

  const getMethodLabel = (transaction) => {
    const t = transaction.type?.toLowerCase?.();
    if (t === "zelle" || t === "digital" || t === "cashapp" || t === "venmo") {
      return "Digital Transfer";
    } else if (t === "card" && transaction.card_is_debit) {
      return "Debit Card";
    } else if (t === "card") {
      return "Credit Card";
    } else if (t === "ach" || t === "bank_transfer") {
      return "ACH / Bank Transfer";
    } else if (t === "wire") {
      return "Wire Transfer";
    } else if (t === "check") {
      return "Check";
    } else if (t === "cash") {
      return "Cash";
    } else {
      return t?.charAt(0).toUpperCase() + t?.slice(1);
    }
  };

  const getRefundEligibility = useCallback((transaction) => {
    return validateRefundEligibility(transaction);
  }, []);

  const handleFilterChange = useCallback((field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      search: "",
      dateFrom: "",
      dateTo: "",
      type: "all",
      status: "all",
    });
    setDateError("");
    if (typeof window !== "undefined") {
      sessionStorage.removeItem('tx-filters');
    }
  }, []);

  const clearSearch = useCallback(() => {
    handleFilterChange('search', '');
  }, [handleFilterChange]);

  const toggleSort = useCallback((e) => {
    if (e.type === 'click' || (e.type === 'keydown' && (e.key === 'Enter' || e.key === ' '))) {
      e.preventDefault();
      setSortOrder((prev) => {
        const newOrder = prev === "desc" ? "asc" : "desc";
        const message = newOrder === "desc" ? MESSAGES.dateNewestFirst : MESSAGES.dateOldestFirst;
        setLiveMessage(message);
        setTimeout(() => setLiveMessage(""), 1000);
        return newOrder;
      });
    }
  }, []);

  const viewDetails = useCallback((transaction) => {
    setSelectedTransaction(transaction);
    setDetailsModalOpen(true);
  }, []);

  const closeDetailsModal = useCallback(() => {
    setDetailsModalOpen(false);
    setSelectedTransaction(null);
    // Return focus to the trigger button
    const triggerId = selectedTransaction?.id;
    if (triggerId) {
      setTimeout(() => {
        const trigger = document.querySelector(`[data-details-trigger="${triggerId}"]`);
        trigger?.focus();
      }, 100);
    }
  }, [selectedTransaction]);

  // Legacy clipboard fallback for HTTP and older browsers
  const legacyCopy = (text) => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch { return false; }
  };

  const copyToClipboard = useCallback(async (text, fieldName) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ok = legacyCopy(text);
        if (!ok) throw new Error("execCommand copy failed");
      }
      setCopiedField(fieldName);
      setLiveMessage(MESSAGES.copied);
      setTimeout(() => {
        setCopiedField("");
        setLiveMessage("");
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const handleDownloadInvoice = useCallback((transactionId) => {
    if (onDownloadInvoice) {
      onDownloadInvoice(selectedTransaction);
      return;
    }
    
    // Placeholder download logic - replace with actual API call
    const fileName = `invoice-${transactionId}.pdf`;
    const invoiceContent = `
Invoice for Transaction: ${transactionId}
Date: ${new Date().toLocaleDateString()}
Amount: ${selectedTransaction?.amount || 'N/A'}
Status: ${selectedTransaction?.status || 'N/A'}

This is a placeholder invoice. Replace with actual PDF generation.
    `;
    
    const blob = new Blob([invoiceContent], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, [selectedTransaction, onDownloadInvoice]);

  const handleRequestRefund = useCallback((transaction) => {
    if (onRequestRefund) {
      onRequestRefund(transaction);
    } else {
      // Placeholder refund logic
      alert(`Refund request initiated for transaction ${transaction.id}`);
    }
  }, [onRequestRefund]);

  // Map UI filter values to underlying transaction data
  function typeMatcher(filterValue, tx) {
    if (filterValue === "all") return true;

    switch (filterValue) {
      case "credit_card":
        // Treat any card without the debit flag as credit (fallback = credit)
        return tx.type === "card" && tx.card_is_debit !== true;

      case "debit_card":
        // Show only card transactions explicitly marked as debit
        return tx.type === "card" && tx.card_is_debit === true;

      case "bank_transfer":
        // Merge ACH + Wire (+ any existing "bank_transfer")
        return ["ach", "wire", "bank_transfer"].includes(tx.type);

      case "digital":
        // Roll Zelle into Digital Transfer
        return ["digital", "zelle"].includes(tx.type);

      case "check":
        return tx.type === "check";

      case "cash":
        return tx.type === "cash";

      default:
        return true;
    }
  }

  const processedTransactions = useMemo(() => {
    // Fix any bad statuses from data source first
    const normalized = Array.isArray(transactions)
      ? transactions.map(normalizeTransactionStatusByType)
      : [];
    let filtered = [...normalized];

    // Search filter (debounced)
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter((tx) => {
        const desc = String(tx?.description ?? "").toLowerCase();
        const idStr = String(tx?.id ?? "").toLowerCase();
        return desc.includes(searchLower) || idStr.includes(searchLower);
      });
    }

    // Date range filter (inclusive) - only apply if no date error
    if (!dateError) {
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom + 'T00:00:00');
        filtered = filtered.filter((tx) => {
          const txDate = new Date(tx.date);
          return !isNaN(txDate.getTime()) && txDate >= from;
        });
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo + 'T23:59:59');
        filtered = filtered.filter((tx) => {
          const txDate = new Date(tx.date);
          return !isNaN(txDate.getTime()) && txDate <= to;
        });
      }
    }

    // Type filter (merged UI → underlying types)
    if (filters.type !== "all") {
      filtered = filtered.filter((tx) => typeMatcher(filters.type, tx));
    }

    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter((tx) => tx.status === filters.status);
    }

    // Sort by date with NaN guard
    filtered.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      // Handle invalid dates by pushing them to the end
      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [transactions, debouncedSearch, dateError, filters, sortOrder]);

  // Pagination calculations
  const total = processedTransactions.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIdx = (page - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, total);
  const pageItems = processedTransactions.slice(startIdx, endIdx);

  const handleRowClick = useCallback((transaction, e) => {
    // Only trigger if clicking on the row itself, not on interactive elements
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
    viewDetails(transaction);
  }, [viewDetails]);

  // Check if any filters are active
  const hasActiveFilters = filters.search || filters.dateFrom || filters.dateTo || filters.type !== "all" || filters.status !== "all";

  if (loading) {
    return (
      <div className="tx-container" data-testid="transactions">
        <div className="tx-loading-state">
          <div className="tx-loading-skeleton"></div>
          <p>{MESSAGES.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tx-container" data-testid="transactions">
        <div className="tx-error-state" role="alert">
          <p>{MESSAGES.error}</p>
          <button onClick={() => window.location.reload()} className="tx-retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tx-container" data-testid="transactions">
      {/* Live region for announcements */}
      <div aria-live="polite" aria-atomic="true" className="visually-hidden">
        {liveMessage}
      </div>

      {/* Filters - auto-apply */}
      <div className="tx-filters" role="region" aria-label="Transaction filters">
        <div className="tx-filters-row">
          <div className="tx-search-wrapper">
            <label htmlFor="tx-search" className="visually-hidden">
              {MESSAGES.searchPlaceholder}
            </label>
            <input
              id="tx-search"
              type="text"
              placeholder={MESSAGES.searchPlaceholder}
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="tx-filter-input tx-filter-search"
              aria-label={MESSAGES.searchPlaceholder}
              data-testid="search-input"
            />
            {filters.search && (
              <button
                onClick={clearSearch}
                className="tx-search-clear"
                aria-label={MESSAGES.clearSearch}
                data-testid="clear-search"
              >
                ×
              </button>
            )}
          </div>

          <div className="tx-date-group">
            <label htmlFor="dateFrom" className="tx-date-label">
              {MESSAGES.fromDate}
            </label>
            <input
              id="dateFrom"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              className="tx-filter-input tx-filter-date"
              aria-label="From date"
              placeholder="From"
              data-testid="date-from"
            />
          </div>

          <div className="tx-date-group">
            <label htmlFor="dateTo" className="tx-date-label">
              {MESSAGES.toDate}
            </label>
            <input
              id="dateTo"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              className="tx-filter-input tx-filter-date"
              aria-label="To date"
              placeholder="To"
              data-testid="date-to"
            />
          </div>

          <label htmlFor="tx-type" className="visually-hidden">
            Type filter
          </label>
          <select
            id="tx-type"
            value={filters.type}
            onChange={(e) => handleFilterChange("type", e.target.value)}
            className="tx-filter-select"
            aria-label="Filter by type"
            data-testid="type-filter"
          >
            <option value="all">{MESSAGES.allTypes}</option>
            <option value="credit_card">{MESSAGES.types.credit_card}</option>
            <option value="debit_card">{MESSAGES.types.debit_card}</option>
            <option value="bank_transfer">{MESSAGES.types.bank_transfer}</option>
            <option value="digital">{MESSAGES.types.digital}</option>
            <option value="check">{MESSAGES.types.check}</option>
            <option value="cash">{MESSAGES.types.cash}</option>
          </select>

          <label htmlFor="tx-status" className="visually-hidden">
            Status filter
          </label>
          <select
            id="tx-status"
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="tx-filter-select"
            aria-label="Filter by status"
            data-testid="status-filter"
          >
            <option value="all">{MESSAGES.allStatuses}</option>
            <option value="paid">{MESSAGES.statuses.paid}</option>
            <option value="posted">{MESSAGES.statuses.posted}</option>
            <option value="pending">{MESSAGES.statuses.pending}</option>
            <option value="processing">{MESSAGES.statuses.processing}</option>
            <option value="in_transit">{MESSAGES.statuses.in_transit}</option>
            <option value="sent">{MESSAGES.statuses.sent}</option>
            <option value="released">{MESSAGES.statuses.released}</option>
            <option value="failed">{MESSAGES.statuses.failed}</option>
            <option value="refunded">{MESSAGES.statuses.refunded}</option>
            <option value="partial_refund">{MESSAGES.statuses.partial_refund}</option>
            <option value="disputed">{MESSAGES.statuses.disputed}</option>
            <option value="dispute_open">{MESSAGES.statuses.dispute_open}</option>
            <option value="dispute_won">{MESSAGES.statuses.dispute_won}</option>
            <option value="dispute_lost">{MESSAGES.statuses.dispute_lost}</option>
            <option value="chargeback">{MESSAGES.statuses.chargeback}</option>
            <option value="voided">{MESSAGES.statuses.voided}</option>
            <option value="cancelled">{MESSAGES.statuses.cancelled}</option>
            <option value="reversed">{MESSAGES.statuses.reversed}</option>
          </select>

          <button onClick={clearFilters} className="tx-clear-link" data-testid="clear-filters">
            {MESSAGES.clearFilters}
          </button>
        </div>

        {dateError && (
          <div className="tx-date-error" role="alert">
            {dateError}
          </div>
        )}
      </div>

      {processedTransactions.length === 0 ? (
        <div className="tx-empty-state" data-testid="transactions-empty">
          <div className="tx-empty-content">
            <h3 className="tx-empty-title">{MESSAGES.noTransactionsTitle}</h3>
            <p className="tx-empty-description">
              {MESSAGES.noTransactionsDescription}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="tx-table-wrapper" aria-label="Transactions table">
            <table className="tx-table" data-testid="transactions-table">
              <thead className="tx-thead">
                <tr>
                  <th scope="col" className="tx-th">
                    <button
                      type="button"
                      className="tx-th tx-th--sortable tx-th--button"
                      onClick={toggleSort}
                      onKeyDown={toggleSort}
                      aria-sort={sortOrder === "desc" ? "descending" : "ascending"}
                      aria-label={`${MESSAGES.fields.date}. ${sortOrder === "desc" ? MESSAGES.dateNewestFirst : MESSAGES.dateOldestFirst}`}
                      data-testid="date-header"
                    >
                      {MESSAGES.fields.date} {sortOrder === "desc" ? "↓" : "↑"}
                    </button>
                  </th>
                  <th className="tx-th" scope="col">{MESSAGES.fields.description}</th>
                  <th className="tx-th" scope="col">{MESSAGES.fields.method}</th>
                  <th className="tx-th" scope="col">{MESSAGES.fields.status}</th>
                  <th className="tx-th tx-amount-header" scope="col">{MESSAGES.fields.amount}</th>
                  <th className="tx-th" scope="col">{MESSAGES.fields.action}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((transaction, index) => (
                  <tr
                    key={transaction.id}
                    className={`tx-row ${index % 2 === 0 ? "tx-row--zebra" : ""}`}
                    onClick={(e) => handleRowClick(transaction, e)}
                    data-testid={`transaction-row-${transaction.id}`}
                  >
                    <td className="tx-cell tx-date">{formatDate(transaction.date)}</td>
                    <td className="tx-cell tx-description">
                      {String(transaction.description ?? "").includes("#") ? (
                        <button
                          className="tx-description-link"
                          onClick={() => viewDetails(transaction)}
                          data-testid={`invoice-link-${transaction.id}`}
                        >
                          {transaction.description}
                        </button>
                      ) : (
                        <span className="tx-description-text">{transaction.description}</span>
                      )}
                    </td>
                    <td className="tx-cell tx-method">
                      {getMethodLabel(transaction)}
                    </td>
                    <td className="tx-cell tx-status">{getStatusBadge(transaction.status)}</td>
                    <td className="tx-cell tx-amount">
                      {formatAmount(transaction.amount, ['refunded', 'partial_refund', 'chargeback', 'reversed'].includes(transaction.status))}
                    </td>
                    <td className="tx-cell tx-action">
                      <button 
                        onClick={() => viewDetails(transaction)} 
                        className="tx-action-btn"
                        data-details-trigger={transaction.id}
                        data-testid={`view-details-${transaction.id}`}
                      >
                        {MESSAGES.viewDetails}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List View */}
          <div className="tx-mobile-list" aria-label="Transactions list (mobile)">
            {pageItems.map((transaction) => (
              <div
                key={transaction.id}
                className="tx-mobile-item"
                onClick={(e) => handleRowClick(transaction, e)}
                data-testid={`transaction-row-${transaction.id}`}
              >
                <div className="tx-mobile-header">
                  <span className="tx-mobile-date">{formatDate(transaction.date)}</span>
                  <span className="tx-amount">
                    {formatAmount(transaction.amount, ['refunded', 'partial_refund', 'chargeback', 'reversed'].includes(transaction.status))}
                  </span>
                </div>
                <div className="tx-mobile-description">
                  {String(transaction.description ?? "").includes("#") ? (
                    <button
                      className="tx-description-link"
                      onClick={() => viewDetails(transaction)}
                      data-testid={`invoice-link-${transaction.id}`}
                    >
                      {transaction.description}
                    </button>
                  ) : (
                    transaction.description
                  )}
                </div>
                <div className="tx-mobile-meta">
                  <span className="tx-mobile-method">
                    {getMethodLabel(transaction)}
                  </span>
                  {transaction.reference && (
                    <span className="tx-mobile-reference">{transaction.reference}</span>
                  )}
                </div>
                <div className="tx-mobile-footer">
                  {getStatusBadge(transaction.status)}
                  <button
                    onClick={() => viewDetails(transaction)}
                    className="tx-mobile-action"
                    data-details-trigger={transaction.id}
                    data-testid={`view-details-${transaction.id}`}
                  >
                    {MESSAGES.viewDetails}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="tx-pagination">
              <div className="tx-pagination__info">
                Showing {startIdx + 1}–{endIdx} of {total}
              </div>
              <div className="tx-pagination__controls">
                <button
                  className="tx-page-btn"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    className={`tx-page-num ${page === n ? 'is-active' : ''}`}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}
                <button
                  className="tx-page-btn"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Transaction Details Modal - Enhanced with comprehensive payment method details */}
      <TxDetailsModal
        open={detailsModalOpen}
        onClose={closeDetailsModal}
        maxWidth="clamp(560px, 70vw, 820px)"
        padV={28}
        className="tx-details-modal"
        aria-labelledby="tx-details-title"
      >
        {selectedTransaction && (
          <div className="tx-details-container">
            <div className="tx-details-header">
              <h2 id="tx-details-title" className="tx-details-title" data-testid="modal-title">
                {MESSAGES.transactionDetails}
              </h2>
            </div>

            <div className="tx-details-content">
              <div className="tx-details-field">
                <label>{MESSAGES.fields.transactionId}</label>
                <button
                  type="button"
                  onClick={() => copyToClipboard(String(selectedTransaction.id), 'id')}
                  className={`tx-copyable ${copiedField === 'id' ? 'is-copied' : ''}`}
                  aria-label={`${MESSAGES.copy} transaction ID`}
                  data-testid="copy-id"
                  title={String(selectedTransaction.id)}
                >
                  <span className="tx-details-mono tx-copyable__text">
                    {String(selectedTransaction.id)}
                  </span>
                  <span className="tx-copyable__icon" aria-hidden="true">
                    {copiedField === 'id' ? <Check size={16} strokeWidth={2} /> : <Copy size={16} strokeWidth={1.8} />}
                  </span>
                </button>
              </div>

              <div className="tx-details-field">
                <label>{MESSAGES.fields.dateTime}</label>
                <span>{formatDate(selectedTransaction.date)}</span>
              </div>

              <div className="tx-details-field">
                <label>{MESSAGES.fields.description}</label>
                <span>{selectedTransaction.description}</span>
              </div>

              <div className="tx-details-field">
                <label>{MESSAGES.fields.type}</label>
                <span>{getTypeLabel(selectedTransaction.type)}</span>
              </div>

              <div className="tx-details-field">
                <label>{MESSAGES.fields.method}</label>
                <span>
                  {getMethodLabel(selectedTransaction)}
                </span>
              </div>

              <div className="tx-details-field">
                <label>{MESSAGES.fields.status}</label>
                <span>{getStatusBadge(selectedTransaction.status)}</span>
              </div>

              <div className="tx-details-field">
                <label>{MESSAGES.fields.amount}</label>
                <span className="tx-details-amount">
                  {formatAmount(selectedTransaction.amount, ['refunded', 'partial_refund', 'chargeback', 'reversed'].includes(selectedTransaction.status))}
                </span>
              </div>

              {/* Payment Method Specific Fields */}
              {selectedTransaction.method_last4 && (
                <div className="tx-details-field">
                  <label>{MESSAGES.fields.lastFour}</label>
                  <span>****{selectedTransaction.method_last4}</span>
                </div>
              )}

              {selectedTransaction.bank_ref && (
                <div className="tx-details-field">
                  <label>{MESSAGES.fields.bankRef}</label>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(String(selectedTransaction.bank_ref), 'bank_ref')}
                    className={`tx-copyable ${copiedField === 'bank_ref' ? 'is-copied' : ''}`}
                  >
                    <span className="tx-details-mono tx-copyable__text">
                      {selectedTransaction.bank_ref}
                    </span>
                    <span className="tx-copyable__icon" aria-hidden="true">
                      {copiedField === 'bank_ref' ? <Check size={16} strokeWidth={2} /> : <Copy size={16} strokeWidth={1.8} />}
                    </span>
                  </button>
                </div>
              )}

              {selectedTransaction.check_no && (
                <div className="tx-details-field">
                  <label>{MESSAGES.fields.checkNo}</label>
                  <span>{selectedTransaction.check_no}</span>
                </div>
              )}

              {selectedTransaction.recipient && (
                <div className="tx-details-field">
                  <label>{MESSAGES.fields.recipient}</label>
                  <span>{selectedTransaction.recipient}</span>
                </div>
              )}

              {selectedTransaction.pickup_location && (
                <div className="tx-details-field">
                  <label>{MESSAGES.fields.pickupLocation}</label>
                  <span>{selectedTransaction.pickup_location}</span>
                </div>
              )}

              {selectedTransaction.clerk_id && (
                <div className="tx-details-field">
                  <label>{MESSAGES.fields.clerkId}</label>
                  <span>{selectedTransaction.clerk_id}</span>
                </div>
              )}

              {selectedTransaction.dispute_reason && (
                <div className="tx-details-field">
                  <label>{MESSAGES.fields.disputeReason}</label>
                  <span>{selectedTransaction.dispute_reason}</span>
                </div>
              )}

              {selectedTransaction.failure_code && (
                <div className="tx-details-field">
                  <label>{MESSAGES.fields.failureCode}</label>
                  <span>{selectedTransaction.failure_code}</span>
                </div>
              )}

              {selectedTransaction.reference && (
                <div className="tx-details-field">
                  <label>{MESSAGES.fields.reference}</label>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(String(selectedTransaction.reference), 'reference')}
                    className={`tx-copyable ${copiedField === 'reference' ? 'is-copied' : ''}`}
                  >
                    <span className="tx-details-mono tx-copyable__text">
                      {selectedTransaction.reference}
                    </span>
                    <span className="tx-copyable__icon" aria-hidden="true">
                      {copiedField === 'reference' ? <Check size={16} strokeWidth={2} /> : <Copy size={16} strokeWidth={1.8} />}
                    </span>
                  </button>
                </div>
              )}

              {/* Refund Information */}
              {(() => {
                const refundEligibility = getRefundEligibility(selectedTransaction);
                const isAlreadyRefunded = ['refunded', 'partial_refund'].includes(selectedTransaction.status);
                const isPaid = ['paid', 'posted'].includes(selectedTransaction.status);
                const isDisputed = ['disputed', 'dispute_open', 'chargeback'].includes(selectedTransaction.status);

                return (
                  <div className="tx-refund-section">
                    <h3 className="tx-refund-title">{MESSAGES.refundInfo}</h3>

                    {isAlreadyRefunded ? (
                      <div className="tx-refund-status tx-refund-eligible">
                        <AlertCircle size={18} />
                        <span>{MESSAGES.refundAlreadyProcessed}</span>
                      </div>
                    ) : isDisputed ? (
                      <div className="tx-refund-status tx-refund-not-eligible">
                        <AlertCircle size={18} />
                        <span>Cannot refund disputed transactions</span>
                      </div>
                    ) : (
                      <div className={`tx-refund-status ${refundEligibility.eligible ? 'tx-refund-eligible' : 'tx-refund-not-eligible'}`}>
                        <AlertCircle size={18} />
                        <span>
                          {refundEligibility.eligible ? MESSAGES.refundEligible : MESSAGES.refundNotEligible}
                        </span>
                      </div>
                    )}

                    <p className="tx-refund-reason">
                      {isAlreadyRefunded 
                        ? 'This charge has been fully refunded.' 
                        : isDisputed 
                        ? 'Disputed transactions must be resolved before refunds can be processed.'
                        : refundEligibility.reason}
                    </p>

                    {refundEligibility.eligible && isPaid && !isDisputed && (
                      <button
                        className="tx-refund-btn"
                        onClick={() => handleRequestRefund(selectedTransaction)}
                        data-testid="request-refund-btn"
                      >
                        {MESSAGES.requestRefund}
                      </button>
                    )}
                  </div>
                );
              })()}

              {(['refunded', 'partial_refund', 'chargeback', 'reversed'].includes(selectedTransaction.status) || Number(selectedTransaction.amount) < 0) && (
                <div className="tx-refund-note">
                  <strong>Note:</strong> Refunded amounts are shown with a minus sign (–) to indicate the reversed transaction.
                </div>
              )}

              <button
                className="tx-download-btn"
                onClick={() => handleDownloadInvoice(selectedTransaction.id)}
              >
                Download Invoice
              </button>
            </div>
          </div>
        )}
      </TxDetailsModal>
    </div>
  );
}