import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerHeader from '../../../components/header/customer/customerheader.jsx';
import CustomerDashboardFooter from '../../../components/footer/customer-dashboard-footer.jsx';
import LiveChat from '../../../components/live-chat/live-chat.jsx';
import './refunds-cancellations.css';

const RefundsCancellations = () => {
  const [expandedFaq, setExpandedFaq] = useState(null);
  const navigate = useNavigate();
  const openHelp = () => navigate('/dashboard/help');

  const cancellationWindows = [
    {
      title: 'Before a carrier is assigned',
      description: 'You can cancel with no dispatch fee.',
      status: 'free',
      timeframe: 'Usually within 24–48 hours of booking',
    },
    {
      title: 'After a carrier is assigned, before pickup',
      description: 'A dispatch fee may apply.',
      status: 'fee',
      timeframe: 'Carrier confirmed but not yet at pickup location',
    },
    {
      title: 'After pickup',
      description: 'The shipment is in progress and is generally non-refundable.',
      status: 'non-refundable',
      timeframe: 'Vehicle is loaded and in transit',
    },
  ];

  const refundEligibility = [
    {
      title: 'Service not rendered',
      description:
        'No carrier assigned by agreed timeframe can be eligible for a refund.',
    },
    {
      title: 'Significant delays',
      description:
        'Delays outside reasonable windows without updates may be eligible for review.',
    },
    {
      title: 'Billing errors',
      description:
        'Duplicate charges or billing errors will be corrected promptly.',
    },
    {
      title: 'Service not delivered',
      description:
        'Add-ons not delivered (e.g., enclosed promised but open truck used) will be investigated.',
    },
  ];

  const cancellationSteps = [
    {
      step: 1,
      title: 'Go to Dashboard → Help',
      description: 'Open a cancellation request through your dashboard.',
    },
    {
      step: 2,
      title: 'Provide your Order ID',
      description: 'Include your Order ID and the reason for cancelling.',
    },
    {
      step: 3,
      title: 'Review & confirmation',
      description: 'Our team confirms fees (if any) and next steps in writing.',
    },
  ];

  const refundProcess = [
    {
      title: 'Timing',
      description:
        'Approved refunds are typically processed within 5–10 business days to your original payment method.',
    },
    {
      title: 'Confirmation',
      description: 'You’ll receive an email when processing is complete.',
    },
    {
      title: 'Questions',
      description: 'Reply to the case thread in Dashboard → Help.',
    },
  ];

  const faqs = [
    {
      question: 'Can I change delivery dates instead of cancel?',
      answer:
        'Often yes. Contact us in Help; we can usually coordinate new dates with the carrier without a full cancellation.',
    },
    {
      question: 'What if a driver no-shows?',
      answer:
        'Report it immediately. We’ll reassign or review for refund eligibility—no-shows are taken seriously.',
    },
    {
      question: 'What about deposits?',
      answer:
        'Deposits may be refundable before dispatch. See your booking terms; we evaluate case-by-case.',
    },
    {
      question: 'How long do I have to cancel?',
      answer:
        'You can request cancellation anytime. Fees and eligibility depend on shipment stage—earlier is better.',
    },
    {
      question: 'What counts as a reasonable delay?',
      answer:
        'Generally 3–5 business days beyond the pickup window, depending on weather, availability, and route complexity.',
    },
  ];

  return (
    <div className="rc-page">
      <CustomerHeader />

      <main className="rc-container">
        <header className="rc-header">
          <h1>Refunds & Cancellations</h1>
          <p className="rc-subtitle">
            How cancellations work and when refunds may apply.
          </p>
        </header>

        {/* Cancellation Windows */}
        <section className="rc-card">
          <h2 className="rc-h2">Cancellation Windows</h2>
          <div className="rc-windows">
            {cancellationWindows.map((w, i) => (
              <article key={i} className={`rc-window rc-${w.status}`}>
                <div className="rc-window-head">
                  <h3 className="rc-h3">{w.title}</h3>
                  <span className={`rc-chip rc-${w.status}`}>
                    {w.status === 'free' && 'No Fee'}
                    {w.status === 'fee' && 'Fee Applies'}
                    {w.status === 'non-refundable' && 'Non-Refundable'}
                  </span>
                </div>
                <p className="rc-p">{w.description}</p>
                <p className="rc-time">{w.timeframe}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Refund Eligibility */}
        <section className="rc-card">
          <h2 className="rc-h2">Refund Eligibility</h2>
          <div className="rc-grid">
            {refundEligibility.map((e, i) => (
              <article key={i} className="rc-tile rc-accent">
                <h3 className="rc-h3">{e.title}</h3>
                <p className="rc-p">{e.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How to Cancel */}
        <section className="rc-card">
          <h2 className="rc-h2">How to Cancel</h2>
          <div className="rc-steps">
            {cancellationSteps.map((s) => (
              <article key={s.step} className="rc-step">
                <div className="rc-step-num">{s.step}</div>
                <div>
                  <h3 className="rc-h3">{s.title}</h3>
                  <p className="rc-p">{s.description}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="rc-help-cta">
            <button
              type="button"
              className="rc-btn rc-btn-primary"
              onClick={openHelp}
              aria-label="Open Help Center"
            >
              Open Help Center
            </button>
          </div>
        </section>

        {/* Refund Process */}
        <section className="rc-card">
          <h2 className="rc-h2">Refund Process</h2>
          <div className="rc-grid">
            {refundProcess.map((p, i) => (
              <article key={i} className="rc-tile rc-accent-alt">
                <h3 className="rc-h3">{p.title}</h3>
                <p className="rc-p">{p.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section className="rc-card">
          <h2 className="rc-h2">FAQs</h2>
          <div className="rc-faq">
            {faqs.map((f, i) => (
              <div key={i} className="rc-faq-item">
                <button
                  className={`rc-faq-q ${expandedFaq === i ? 'is-open' : ''}`}
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                >
                  <span>{f.question}</span>
                  <span className="rc-toggle">{expandedFaq === i ? '−' : '+'}</span>
                </button>
                {expandedFaq === i && (
                  <div className="rc-faq-a">
                    <p className="rc-p">{f.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Disclaimer */}
        <section className="rc-card rc-muted">
          <h3 className="rc-h3">Policy Note</h3>
          <p className="rc-p rc-center rc-max">
            This summary is for convenience; your booking confirmation and
            carrier terms govern in case of conflict. Each cancellation and
            refund request is reviewed individually based on timing and
            circumstances.
          </p>
        </section>
      </main>

      <LiveChat />
      <CustomerDashboardFooter />
    </div>
  );
};

export default RefundsCancellations;
