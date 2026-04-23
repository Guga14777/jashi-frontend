import React, { useState, useCallback, useEffect } from "react";
import "./payments.css";
import "./components/payments-components.css";

import Transactions from "./components/transactions.jsx";
import Toast from "../../../components/ui/toast.jsx";
import CustomerDashboardFooter from "../../../components/footer/customer-dashboard-footer.jsx";
import LiveChat from "../../../components/live-chat/live-chat.jsx";

// Utils
import { formatCurrency as fmtCurrency } from "@/utils/formatters.js";

// Auth context
import { useAuth } from "../../../store/auth-context.jsx";

// API service
import * as paymentsApi from "../../../services/payments.api.js";

export default function Payments() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    loadPaymentsData(controller.signal);
    return () => controller.abort();
  }, [token]);

  const loadPaymentsData = async (signal) => {
    setIsLoading(true);

    try {
      // Fetch real payment data from API
      const response = await paymentsApi.getCustomerPayments(token);
      
      if (response.success && response.payments) {
        console.log('✅ Loaded real payments:', response.payments.length);
        setTransactions(response.payments);
      } else {
        // No payments yet - show empty state
        setTransactions([]);
      }
      
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error('Failed to load payments:', error);
      // Show empty state on error
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadInvoice = useCallback((transaction) => {
    const fileName = `invoice-${transaction.id}.pdf`;
    const invoiceContent = `
Invoice for Transaction: ${transaction.id}
Date: ${new Date(transaction.date).toLocaleDateString()}
Amount: ${fmtCurrency(transaction.amount)}
Status: ${transaction.status}
Method: ${transaction.methodLabel || transaction.type}

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

    setToast({
      type: "success",
      message: `Invoice ${transaction.id} downloaded`,
    });
  }, []);

  const handleRequestRefund = useCallback((transaction) => {
    setToast({
      type: "info",
      message: `Refund request initiated for transaction ${transaction.id}`,
    });
  }, []);

  return (
    <>
      <div className="payments-page" role="main" aria-labelledby="payments-title" data-testid="payments-page">
        <div className="payments-container">
          <div className="payments-header">
            <h1 id="payments-title" className="payments-title">Payments</h1>
          </div>

          <div className="payments-content" aria-live="polite">
            {/* Loading */}
            {isLoading ? (
              <div className="payments-loading" data-testid="payments-loading">
                <span>Loading payments data...</span>
              </div>
            ) : (
              <div className="payments-main-content">
                {/* Transactions - Full Width */}
                <section className="payments-card" data-testid="transactions-card" aria-labelledby="transactions-title">
                  <div className="payments-card-header">
                    <h2 id="transactions-title" className="payments-card-title">Transaction History</h2>
                  </div>
                  <div className="payments-card-content">
                    {transactions.length === 0 ? (
                      <div className="payments-empty" data-testid="no-transactions">
                        <div className="payments-empty-icon" aria-hidden>
                          <svg width="48" height="48" viewBox="0 0 24 24" focusable="false">
                            <path d="M2 7h20v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7zm3-4h14a1 1 0 0 1 1 1v3H4V4a1 1 0 0 1 1-1zm10.5 9.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
                          </svg>
                        </div>
                        <h3 className="payments-empty-title">No transactions yet</h3>
                        <p className="payments-empty-description">
                          Your payment history will appear here once you start making transactions.
                        </p>
                      </div>
                    ) : (
                      <Transactions 
                        transactions={transactions} 
                        formatCurrency={fmtCurrency}
                        onDownloadInvoice={handleDownloadInvoice}
                        onRequestRefund={handleRequestRefund}
                      />
                    )}
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>

        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </div>
      <CustomerDashboardFooter />
      <LiveChat />
    </>
  );
}