import React, { useState, useMemo } from "react";
import "./help.css";
import CarrierDashboardFooter from "../../components/footer/carrier-dashboard-footer.jsx";
import LiveChat from "../../components/live-chat/live-chat.jsx";

const FAQS = [
  // PAYMENTS & PAYOUTS
  {
    id: "payment-timing",
    q: "When do I get paid?",
    a: "It depends on who pays and on your payout cadence. • COD loads: the customer pays you at delivery (cash or approved digital transfer). • Prepaid loads: once delivery is confirmed and a clear POD is uploaded, funds move to \"Released\" and are disbursed on your selected cadence (Daily, Weekly—Friday, Bi-weekly—Friday, or Monthly—last business day). Your bank's posting can add 0–2 business days."
  },
  {
    id: "payout-methods",
    q: "Which payout methods do you support?",
    a: "Customers can pay by Cash (COD), Card, Digital transfer (e.g., Zelle or similar), or ACH. For prepaid loads we disburse to your saved payout destination according to your chosen cadence."
  },
  {
    id: "who-decides-method",
    q: "Who decides how I'm paid?",
    a: "The customer chooses how they pay for the shipment (cash at delivery, card, digital transfer, or ACH). For COD loads you collect directly from the customer. For prepaid loads we pay you to your saved payout destination on your set cadence."
  },
  {
    id: "payout-cadence",
    q: "What payout cadence can I choose?",
    a: "Daily (next business day), Weekly (Friday), Bi-weekly (Friday), or Monthly (last business day). You can change this in Payments → Payout Settings. Changes apply to future disbursements. If Friday or the last business day is a bank holiday, disbursement moves to the prior business day."
  },
  {
    id: "carrier-fees",
    q: "Do I pay any platform fees on payouts?",
    a: "No. Carriers aren't charged platform payout fees. If you ever request an optional bank service (e.g., a same-day wire) your bank's fee may apply, but we don't add a carrier platform fee."
  },
  {
    id: "payment-delays",
    q: "What can delay my payout?",
    a: "Blurred/missing POD, mismatched IDs, bank limits, weekends/holidays or missed cutoffs, or an active claim/dispute on the load."
  },
  {
    id: "pod-requirements",
    q: "What proof of delivery (POD) do you require?",
    a: "A legible photo or PDF showing signatures, date/time, and the correct load ID. Upload at delivery or within 24 hours so we can release funds on time."
  },
  {
    id: "track-payout",
    q: "How do I track my payout?",
    a: "Go to Payments → Payouts to see status (Pending → Released → Sent → Posted). Open any payout to view the method, timeline, and any notes."
  },
  {
    id: "change-payout-settings",
    q: "How do I change my bank or cadence?",
    a: "Go to Payments → Payout Settings to update your bank account or payout cadence. Changes affect future payouts only."
  },
  {
    id: "payment-rejected",
    q: "What happens if my bank/Zelle/card rejects the payment?",
    a: "We'll notify you to update details and re-issue via the same or different method. Re-issue may reset timelines and incur the method's fee again."
  },
  {
    id: "cash-pickup",
    q: "Can I pick up cash?",
    a: "Yes, by appointment. Bring a government ID that matches your profile. Cash payouts include a cash-handling fee and may have per-day limits."
  },

  // RATES, RATINGS & DISPATCH
  {
    id: "rate-calculation",
    q: "How is the posted rate / rate-per-mile set?",
    a: "By distance, route demand, vehicle type, urgency/timing, and market conditions. You'll always see total payout and RPM before accepting."
  },
  {
    id: "negotiate-rate",
    q: "Can I negotiate the rate?",
    a: "Yes. Tap Negotiate on the load and submit your counter with a short note (timing, equipment, extra miles). Most responses arrive within a few hours."
  },
  {
    id: "carrier-rating",
    q: "How is my carrier rating calculated?",
    a: "Weighted on on-time delivery %, cancellation rate, POD/document accuracy, and complaint rate. The last 90 days carry more weight."
  },
  {
    id: "rating-impact",
    q: "Do cancellations or late deliveries affect my rating?",
    a: "Yes. Cancellations reduce your acceptance/cancel ratio; late deliveries and missing updates reduce on-time %. Repeated issues may limit load access."
  },
  {
    id: "improve-rating",
    q: "How do I improve my rating quickly?",
    a: "Keep ETAs updated, avoid avoidable cancellations, upload clean PODs, and communicate in-app. Aim for high on-time and near-zero cancels."
  },
  {
    id: "location-change",
    q: "What if pickup or delivery details change?",
    a: "Tap Report Issue on the load and message the shipper in-app. Wait for the updated terms/rate to appear before proceeding."
  },

  // OPERATIONAL ISSUES
  {
    id: "find-loads",
    q: "How do I find profitable loads?",
    a: "Use Available Loads and filter by rate per mile, preferred lanes, and equipment type. Sort by highest RPM or quickest turnaround."
  },
  {
    id: "pod-upload-issues",
    q: "Why can't I upload my POD?",
    a: "Ensure file is under 10MB and in PDF/JPG/PNG format. If on mobile, allow photo permissions. Check that the load ID is visible in the document."
  },
  {
    id: "no-loads-showing",
    q: "Why aren't I seeing any loads?",
    a: "Check your filters, expand your search radius, ensure your status is set to Available, and verify all documents are current and approved."
  },
  {
    id: "dispute-issue",
    q: "How do I dispute a load issue or rating?",
    a: "Go to the load details or your Ratings page and click Dispute within 48 hours. Provide evidence like photos, messages, or timestamps."
  },
  {
    id: "insurance-requirements",
    q: "What insurance coverage is required?",
    a: "Minimums vary by vehicle type and route. Your certificate must show active coverage, policy limits, and your name matching your profile."
  }
];

export default function Help() {
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);
  
  // Support ticket state
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketTouched, setTicketTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success', 'error', or null
  const [errorMessage, setErrorMessage] = useState('');
  const [ticketId, setTicketId] = useState(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return FAQS;
    const q = search.toLowerCase();
    return FAQS.filter(
      f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
    );
  }, [search]);

  const highlight = (text) => {
    if (!search.trim()) return text;
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedSearch})`, "gi"));
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
    setErrorMessage('');

    try {
      // TEMPORARY: Mock implementation for testing UI
      // Remove this and uncomment the real API call below when backend is ready
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
      
      // Mock success response
      const result = { ticketId: `TKT-${Date.now()}` };
      setSubmitStatus('success');
      setTicketId(result.ticketId);
      setTicketSubject('');
      setTicketMessage('');
      setTicketTouched(false);
      return;

      // REAL API CALL (uncomment when backend is ready):
      /*
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}` // Or however you handle auth
        },
        body: JSON.stringify({
          subject: ticketSubject.trim(),
          message: ticketMessage.trim(),
          source: 'carrier-portal-help',
          userAgent: navigator.userAgent,
          currentUrl: window.location.href
        })
      });

      let result = null;
      let errorMessage = 'Failed to submit support request';

      // Handle different response scenarios
      if (!response.ok) {
        // Try to parse error response
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || `Server error (${response.status})`;
        } catch (jsonError) {
          // If JSON parsing fails, use status-based error message
          if (response.status === 404) {
            errorMessage = 'Support service unavailable. Please try again later.';
          } else if (response.status === 401) {
            errorMessage = 'Please log in again and try submitting your request.';
          } else if (response.status === 429) {
            errorMessage = 'Too many requests. Please wait a moment before trying again.';
          } else if (response.status >= 500) {
            errorMessage = 'Server error. Please try again in a few minutes.';
          } else {
            errorMessage = `Request failed (${response.status}). Please try again.`;
          }
        }
        throw new Error(errorMessage);
      }

      // Try to parse success response
      try {
        result = await response.json();
      } catch (jsonError) {
        // If we can't parse the response but got a 2xx status, assume success
        console.warn('Could not parse response JSON, but request appears successful');
        result = { ticketId: 'Unknown' };
      }
      
      // Success
      setSubmitStatus('success');
      setTicketId(result.ticketId || 'Unknown');
      
      // Clear form
      setTicketSubject('');
      setTicketMessage('');
      setTicketTouched(false);
      */

    } catch (error) {
      console.error('Support ticket submission failed:', error);
      setSubmitStatus('error');
      setErrorMessage(error.message || 'Failed to submit your request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitStatus(null);
    setErrorMessage('');
    setTicketId(null);
  };

  return (
    <>
      <div className="help-page">
        <div className="help-header">
          <h1>Carrier Help Center</h1>
          <p>Find answers fast or submit a support request.</p>

          <div className="search-container">
            <div className="search-input-wrapper">
              <span className="search-icon" aria-hidden="true">🔍</span>
              <input
                className="search-input"
                type="text"
                placeholder="Search FAQs (payments, POD, rates, dispatch…)"
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
                <p>Try different keywords, or submit a support request below.</p>
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
                      onClick={() => setOpenId(openId === f.id ? null : f.id)}
                    >
                      <span>{highlight(f.q)}</span>
                      <span className="faq-toggle" aria-hidden="true">
                        {openId === f.id ? "−" : "+"}
                      </span>
                    </button>
                    {openId === f.id && (
                      <div className="faq-answer">
                        <p>{highlight(f.a)}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Support Ticket */}
          <section className="help-section support-ticket">
            <h2>Submit Support Request</h2>
            <p className="contact-subtitle">We typically respond within 1 business day to your registered email.</p>

            {submitStatus === 'success' && (
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

            {submitStatus === 'error' && (
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

            {submitStatus !== 'success' && (
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
                    className={!ticketSubjectValid && ticketTouched ? 'error' : ''}
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
                    placeholder="Provide details about your question or issue (load ID, route, dates, etc.)..."
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
                    'Submit Support Request'
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
      <CarrierDashboardFooter />
      <LiveChat />
    </>
  );
}