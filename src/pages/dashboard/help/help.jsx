import React, { useState, useMemo, useEffect } from "react";
import "./help.css";
import CustomerDashboardFooter from "../../../components/footer/customer-dashboard-footer.jsx";
import LiveChat from "../../../components/live-chat/live-chat.jsx";

const FAQS = [
  {
    id: "submit-offer",
    q: "How do I submit an offer?",
    a: "Set your pickup and drop-off ZIPs, choose vehicle(s) and transport type, enter your price, and click Submit Offer. You'll then sign in (or create an account) to finalize the details. A dispatch-likelihood meter shows how competitive your offer is before you post."
  },
  {
    id: "finalize-offer",
    q: "What details do I add after submitting an offer?",
    a: "After you submit, you'll add: full pickup & delivery addresses, contact name/phone/email, pickup window/date, vehicle details (year/make/model, operable/keys, notes, VIN optional), and any special instructions. We publish your offer once these are confirmed."
  },
  {
    id: "vehicles-supported",
    q: "Which vehicles can I ship?",
    a: "We support Sedan, SUV, Pickup, Van, and specialty vehicles including Motorcycle, ATV, Dirt Bike, Golf Cart, Snowmobile, Minivan, RV/Motorhome, Box Truck, Trailer, and Boat on Trailer."
  },
  {
    id: "coverage",
    q: "What areas do you serve?",
    a: "We provide coverage across the United States, with select cross-border lanes. Enter any route in the quote form to check availability."
  },
  {
    id: "pricing",
    q: "How is pricing calculated? Are there extra fees?",
    a: "Pricing is based on mileage, lane demand, and state-level costs like tolls and fuel. You set your own offer and we show how competitive it is. Optional services (e.g., enclosed transport, inside delivery, wait time) appear as separate line items before booking."
  },
  {
    id: "timing",
    q: "When will my shipment be picked up and delivered?",
    a: "Timing depends on how competitive your offer is. A higher dispatch-likelihood means faster acceptance. You control the price—and with our 3% fee (vs brokers up to 15%), you can ship faster and more affordably."
  },
  {
    id: "tracking",
    q: "How do I track my shipment?",
    a: "You'll receive automatic updates by email and/or SMS (your choice) from pickup to delivery, including live ETA."
  },
  {
    id: "payments",
    q: "What payment methods do you accept and when am I charged?",
    a: "Customers pay a 3% platform fee once a carrier accepts their offer. The remaining balance is paid directly to the carrier by your preferred method—cash, check, card, or digital payments such as Zelle or Cash App."
  },
  {
    id: "refunds",
    q: "What's your cancellation and refund policy?",
    a: "You're not charged before a carrier accepts your offer. Once accepted, the 3% platform fee is non-refundable if you cancel. Refunds go back to the original payment method if applicable."
  }
];

export default function Help() {
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);
  const [lastOpenId, setLastOpenId] = useState(null);

  // Support ticket state (same behavior as Carrier Help)
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketTouched, setTicketTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
  const [errorMessage, setErrorMessage] = useState("");
  const [ticketId, setTicketId] = useState(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return FAQS;
    const q = search.toLowerCase();
    return FAQS.filter(
      f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
    );
  }, [search]);

  // Auto-open single match; restore last opened when search clears
  useEffect(() => {
    if (filtered.length === 1) {
      setOpenId(filtered[0].id);
    } else if (search.trim() === "" && lastOpenId) {
      setOpenId(lastOpenId);
    }
  }, [filtered, search, lastOpenId]);

  // Track last opened item when user manually opens/closes
  const handleToggle = (id) => {
    const newOpenId = openId === id ? null : id;
    setOpenId(newOpenId);
    if (newOpenId) {
      setLastOpenId(newOpenId);
    }
  };

  const highlight = (text) => {
    if (!search.trim()) return text;
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "gi"));
    return parts.map((p, i) =>
      p.toLowerCase() === search.toLowerCase()
        ? <mark key={i} className="search-highlight">{p}</mark>
        : <span key={i}>{p}</span>
    );
  };

  const ticketSubjectValid = ticketSubject.trim().length >= 4;
  const canSubmit = ticketSubjectValid && !isSubmitting;

  const submitSupportTicket = async (e) => {
    e.preventDefault();
    setTicketTouched(true);
    if (!ticketSubjectValid) return;

    setIsSubmitting(true);
    setSubmitStatus(null);
    setErrorMessage("");

    try {
      // ------- MOCK (keeps UI identical to Carrier until backend is ready) -------
      await new Promise(r => setTimeout(r, 1500));
      const result = { ticketId: `TKT-${Date.now()}` };
      setSubmitStatus("success");
      setTicketId(result.ticketId);
      setTicketSubject("");
      setTicketMessage("");
      setTicketTouched(false);
      return;

      // ------- REAL API (uncomment when ready; same as Carrier) -------
      /*
      const resp = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          subject: ticketSubject.trim(),
          message: ticketMessage.trim(),
          source: 'customer-portal-help',
          userAgent: navigator.userAgent,
          currentUrl: window.location.href
        })
      });

      let result = null;
      let errMsg = 'Failed to submit support request';

      if (!resp.ok) {
        try {
          const data = await resp.json();
          errMsg = data.message || data.error || `Server error (${resp.status})`;
        } catch {
          if (resp.status === 404) errMsg = 'Support service unavailable. Please try again later.';
          else if (resp.status === 401) errMsg = 'Please log in again and try submitting your request.';
          else if (resp.status === 429) errMsg = 'Too many requests. Please wait and try again.';
          else if (resp.status >= 500) errMsg = 'Server error. Please try again in a few minutes.';
          else errMsg = `Request failed (${resp.status}). Please try again.`;
        }
        throw new Error(errMsg);
      }

      try {
        result = await resp.json();
      } catch {
        console.warn('Could not parse response JSON, assuming success');
        result = { ticketId: 'Unknown' };
      }

      setSubmitStatus('success');
      setTicketId(result.ticketId || 'Unknown');
      setTicketSubject('');
      setTicketMessage('');
      setTicketTouched(false);
      */
    } catch (err) {
      console.error("Support ticket submission failed:", err);
      setSubmitStatus("error");
      setErrorMessage(err.message || "Failed to submit your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitStatus(null);
    setErrorMessage("");
    setTicketId(null);
  };

  return (
    <>
      <div className="help-page">
        <div className="help-header">
          <h1>Customer Help Center</h1>
          <p>Answers about offers, vehicles, tracking, and payments.</p>

          <div className="search-container">
            <div className="search-input-wrapper">
              <input
                className="search-input"
                type="text"
                placeholder="Search FAQs (vehicles, offers, tracking, payments…)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search FAQs"
              />
            </div>
          </div>
        </div>

        <div className="help-content single-column">
          {/* FAQ */}
          <section className="help-section">
            <h2>Frequently Asked Questions</h2>

            {filtered.length === 0 ? (
              <div className="empty-state">
                <h3>No results</h3>
                <p>Try different keywords, or <a href="#support">submit a support request</a>.</p>
              </div>
            ) : (
              <div className="faq-list">
                {filtered.map((f) => (
                  <div
                    key={f.id}
                    className={`faq-accordion ${openId === f.id ? "open" : ""}`}
                  >
                    <button
                      type="button"
                      className="faq-question"
                      aria-expanded={openId === f.id}
                      aria-controls={`panel-${f.id}`}
                      id={`button-${f.id}`}
                      onClick={() => handleToggle(f.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleToggle(f.id);
                        }
                      }}
                    >
                      <span>{highlight(f.q)}</span>
                      <span className="faq-toggle" aria-hidden="true">
                        {openId === f.id ? "−" : "+"}
                      </span>
                    </button>
                    {openId === f.id && (
                      <div
                        id={`panel-${f.id}`}
                        role="region"
                        aria-labelledby={`button-${f.id}`}
                        className="faq-answer"
                      >
                        <p>{highlight(f.a)}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Support Ticket (same UX as Carrier) */}
          <section id="support" className="help-section support-ticket">
            <h2>Submit Support Request</h2>
            <p className="contact-subtitle">We typically respond within 1 business day to your registered email.</p>

            {submitStatus === "success" && (
              <div className="success-message">
                <div className="success-content">
                  <h3>Request Received!</h3>
                  <p>
                    Your support request has been submitted successfully.
                    {ticketId && (
                      <span> Ticket ID: <strong>#{ticketId}</strong></span>
                    )}
                  </p>
                  <p>We've sent a confirmation to your registered email and our support team will respond soon.</p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    onClick={resetForm}
                  >
                    Submit Another Request
                  </button>
                </div>
              </div>
            )}

            {submitStatus === "error" && (
              <div className="error-message">
                <div className="error-content">
                  <h3>Submission Failed</h3>
                  <p>{errorMessage}</p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    onClick={resetForm}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {submitStatus !== "success" && (
              <form onSubmit={submitSupportTicket} className="support-form" noValidate>
                <div className="form-group">
                  <label htmlFor="ticket-subject">
                    Subject <span className="req">*</span>
                  </label>

                  <input
                    id="ticket-subject"
                    type="text"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    onBlur={() => setTicketTouched(true)}
                    maxLength={120}
                    className={!ticketSubjectValid && ticketTouched ? "error" : ""}
                    disabled={isSubmitting}
                    placeholder="Brief description of your issue"
                  />

                  {!ticketSubjectValid && ticketTouched && (
                    <div className="error-text">Please enter at least 4 characters.</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="ticket-message">Message</label>
                  <textarea
                    id="ticket-message"
                    rows={5}
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    placeholder="Provide details about your question or issue (shipment ID, vehicle details, dates, etc.)..."
                    disabled={isSubmitting}
                    maxLength={2000}
                  />
                  {ticketMessage.length > 1800 && (
                    <div className="char-counter">
                      {ticketMessage.length}/2000 characters
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={!canSubmit}
                  aria-disabled={!canSubmit}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner" aria-hidden="true"></span>
                      Submitting...
                    </>
                  ) : (
                    "Submit Support Request"
                  )}
                </button>

                {!ticketSubjectValid && (
                  <div className="subtle-hint">Enter a subject to enable the submit button.</div>
                )}
              </form>
            )}
          </section>
        </div>
      </div>
      <CustomerDashboardFooter />
      <LiveChat />
    </>
  );
}