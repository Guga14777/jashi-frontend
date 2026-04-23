// ============================================================
// FILE: src/pages/shipper-portal/sections/payment.jsx
// ✅ UPDATED: Now sends card info to backend for storage
// ✅ UPDATED: Added cancellation policy disclosure checkbox
// ✅ UPDATED: New policy text aligned with scheduling rules
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { CreditCard, Lock, Info, HandCoins, CalendarCheck } from 'lucide-react';
import { useAuth } from '../../../store/auth-context.jsx';
import { usePortal } from '../index.jsx';
import * as bookingApi from '../../../services/booking.api.js';
import * as quotesApi from '../../../services/quotes.api.js';
import PolicyModal from '../components/policy-modal.jsx';
import './sections.css';

const CARD_TYPES = {
  visa: /^4/,
  mastercard: /^5[1-5]/,
  amex: /^3[47]/,
  discover: /^6(?:011|5)/,
};

const transformSchedulingForBackend = (scheduling) => {
  if (!scheduling) return null;

  const transformed = {
    pickupDate: scheduling.pickupDate,
    dropoffDate: scheduling.dropoffDate,
  };

  if (scheduling.pickupPreferredWindow && scheduling.pickupPreferredWindow !== 'flexible') {
    const [start, end] = scheduling.pickupPreferredWindow.split('-');
    transformed.pickupTimeStart = start;
    transformed.pickupTimeEnd = end;
  } else if (scheduling.pickupCustomFrom && scheduling.pickupCustomTo) {
    transformed.pickupTimeStart = scheduling.pickupCustomFrom;
    transformed.pickupTimeEnd = scheduling.pickupCustomTo;
  }

  if (scheduling.dropoffPreferredWindow && scheduling.dropoffPreferredWindow !== 'flexible') {
    const [start, end] = scheduling.dropoffPreferredWindow.split('-');
    transformed.dropoffTimeStart = start;
    transformed.dropoffTimeEnd = end;
  } else if (scheduling.dropoffCustomFrom && scheduling.dropoffCustomTo) {
    transformed.dropoffTimeStart = scheduling.dropoffCustomFrom;
    transformed.dropoffTimeEnd = scheduling.dropoffCustomTo;
  }

  return transformed;
};

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  
  const {
    quoteData,
    quoteId: contextQuoteId,
    acceptedPrice,
    pickup,
    dropoff,
    vehicles,
    scheduling,
    draftId: contextDraftId,
    goToStep,
    instructions,
    pickupOriginType,
    dealerFirstName,
    dealerLastName,
    dealerPhone,
    auctionGatePass,
    auctionName,
    auctionBuyerNumber,
    privateFirstName,
    privateLastName,
    privatePhone,
    dropoffDestinationType,
    dropoffDealerFirstName,
    dropoffDealerLastName,
    dropoffDealerPhone,
    dropoffAuctionGatePass,
    dropoffAuctionName,
    dropoffAuctionBuyerNumber,
    dropoffPrivateFirstName,
    dropoffPrivateLastName,
    dropoffPrivatePhone,
    pickupGatePassId,
    dropoffGatePassId,
  } = usePortal();

  const urlDraftId = searchParams.get('draftId');
  const urlQuoteId = searchParams.get('quoteId');
  const draftId = contextDraftId || urlDraftId;
  const quoteId = contextQuoteId || urlQuoteId || quoteData?.id;

  const vehicle = vehicles?.[0] || {};

  const [paymentMode, setPaymentMode] = useState('platform_fee_only');
  const [cardNumber, setCardNumber] = useState('');
  const [cardFirstName, setCardFirstName] = useState('');
  const [cardLastName, setCardLastName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [acceptedCancellationPolicy, setAcceptedCancellationPolicy] = useState(false);
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);
  
  const [fetchedQuote, setFetchedQuote] = useState(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);

  useEffect(() => {
    const fetchQuoteData = async () => {
      if (!quoteId || !token) return;
      
      if (acceptedPrice && acceptedPrice > 0) return;
      if (quoteData?.offer && quoteData.offer > 0) return;

      setIsLoadingQuote(true);
      try {
        const response = await quotesApi.getQuoteById(quoteId, token);
        if (response?.quote) {
          setFetchedQuote(response.quote);
        } else if (response?.offer !== undefined) {
          setFetchedQuote(response);
        }
      } catch (error) {
        console.error('❌ Payment: Failed to fetch quote:', error);
      } finally {
        setIsLoadingQuote(false);
      }
    };

    fetchQuoteData();
  }, [quoteId, token, acceptedPrice, quoteData?.offer]);

  const offerAmount = (() => {
    if (acceptedPrice && acceptedPrice > 0) return acceptedPrice;
    if (quoteData?.offer && quoteData.offer > 0) return quoteData.offer;
    if (quoteData?.customerOffer && quoteData.customerOffer > 0) return quoteData.customerOffer;
    if (fetchedQuote?.offer && fetchedQuote.offer > 0) return fetchedQuote.offer;
    if (fetchedQuote?.customerOffer && fetchedQuote.customerOffer > 0) return fetchedQuote.customerOffer;
    return 0;
  })();

  const platformFeeRate = 0.03;
  const platformFee = offerAmount * platformFeeRate;
  const totalAmount = offerAmount + platformFee;
  const cardChargeAmount = paymentMode === 'full_card_charge' ? totalAmount : platformFee;

  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\s/g, '');
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(' ') : cleaned;
  };

  const formatExpiryDate = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      let month = cleaned.slice(0, 2);
      const year = cleaned.slice(2, 4);
      if (parseInt(month, 10) > 12) month = '12';
      return year ? `${month}/${year}` : month;
    }
    return cleaned;
  };

  const handleCardNumberChange = (e) => {
    const value = e.target.value.replace(/\s/g, '');
    if (value.length <= 16 && /^\d*$/.test(value)) {
      setCardNumber(formatCardNumber(value));
      if (errors.cardNumber) setErrors({ ...errors, cardNumber: '' });
    }
  };

  const handleFirstNameChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z\s'-]*$/.test(value)) {
      setCardFirstName(value);
      if (errors.cardFirstName) setErrors({ ...errors, cardFirstName: '' });
    }
  };

  const handleLastNameChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z\s'-]*$/.test(value)) {
      setCardLastName(value);
      if (errors.cardLastName) setErrors({ ...errors, cardLastName: '' });
    }
  };

  const handleExpiryChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 4) {
      setExpiryDate(formatExpiryDate(value));
      if (errors.expiryDate) setErrors({ ...errors, expiryDate: '' });
    }
  };

  const handleCvvChange = (e) => {
    const value = e.target.value;
    if (value.length <= 4 && /^\d*$/.test(value)) {
      setCvv(value);
      if (errors.cvv) setErrors({ ...errors, cvv: '' });
    }
  };

  const validateCard = () => {
    const newErrors = {};
    
    const cleanedCard = cardNumber.replace(/\s/g, '');
    if (!cleanedCard) {
      newErrors.cardNumber = 'Card number is required';
    } else if (cleanedCard.length < 13 || cleanedCard.length > 16) {
      newErrors.cardNumber = 'Invalid card number';
    }
    
    if (!cardFirstName.trim()) newErrors.cardFirstName = 'First name is required';
    if (!cardLastName.trim()) newErrors.cardLastName = 'Last name is required';
    
    if (!expiryDate) {
      newErrors.expiryDate = 'Expiry date is required';
    } else {
      const [month, year] = expiryDate.split('/');
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      
      if (!month || !year || month.length !== 2 || year.length !== 2) {
        newErrors.expiryDate = 'Invalid format';
      } else {
        const expMonth = parseInt(month, 10);
        const expYear = parseInt(year, 10);
        if (expMonth < 1 || expMonth > 12) {
          newErrors.expiryDate = 'Invalid month';
        } else if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
          newErrors.expiryDate = 'Card expired';
        }
      }
    }
    
    if (!cvv) {
      newErrors.cvv = 'CVV is required';
    } else if (cvv.length < 3) {
      newErrors.cvv = 'Invalid CVV';
    }
    
    if (offerAmount <= 0) {
      newErrors.submit = 'Unable to determine offer amount. Please go back and review your quote.';
    }

    if (!acceptedCancellationPolicy) {
      newErrors.cancellationPolicy = 'You must accept the cancellation policy to continue';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateCard();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const effectiveDraftId = draftId || quoteId;
    
    if (!effectiveDraftId) {
      setErrors({ submit: 'Quote not found. Please go back and complete all steps.' });
      return;
    }

    setIsProcessing(true);

    try {
      const extractedQuoteId = quoteId || quoteData?.id || searchParams.get('quoteId');
      
      const effectiveQuoteData = {
        ...fetchedQuote,
        ...quoteData,
      };
      
      const vehicleDetailsPayload = {
        year: vehicle?.year || '',
        make: vehicle?.make || '',
        model: vehicle?.model || '',
        type: vehicle?.type || effectiveQuoteData?.vehicle || '',
        operable: vehicle?.operable || 'yes',
      };
      
      const bookingPayload = {
        draftId: effectiveDraftId,
        quoteId: extractedQuoteId,
        fromCity: effectiveQuoteData?.fromCity || effectiveQuoteData?.fromZip || pickup?.city || pickup?.zip || '',
        toCity: effectiveQuoteData?.toCity || effectiveQuoteData?.toZip || dropoff?.city || dropoff?.zip || '',
        vehicle: effectiveQuoteData?.vehicle || vehicle?.type || '',
        vehicleType: vehicle?.type || effectiveQuoteData?.vehicle || '',
        vehicleDetails: vehicleDetailsPayload,
        vehicles: vehicles || [vehicleDetailsPayload],
        price: offerAmount,
        miles: effectiveQuoteData?.miles || 0,
        transportType: effectiveQuoteData?.transportType || 'open',
        pickupDate: scheduling?.pickupDate || '',
        dropoffDate: scheduling?.dropoffDate || '',
        pickup: pickup || {},
        dropoff: dropoff || {},
        quote: {
          ...effectiveQuoteData,
          id: extractedQuoteId,
          offer: offerAmount,
          vehicleDetails: vehicleDetailsPayload,
        },
        scheduling: transformSchedulingForBackend(scheduling) || scheduling || {},
        instructions: instructions || '',
        customerInstructions: instructions || '',
        notes: instructions || '',
        pickupInstructions: scheduling?.pickupInstructions || '',
        pickupOriginType: pickupOriginType || 'private',
        dropoffDestinationType: dropoffDestinationType || 'private',
        dealerFirstName,
        dealerLastName,
        dealerPhone,
        auctionGatePass,
        auctionName,
        auctionBuyerNumber,
        privateFirstName,
        privateLastName,
        privatePhone,
        dropoffDealerFirstName,
        dropoffDealerLastName,
        dropoffDealerPhone,
        dropoffAuctionGatePass,
        dropoffAuctionName,
        dropoffAuctionBuyerNumber,
        dropoffPrivateFirstName,
        dropoffPrivateLastName,
        dropoffPrivatePhone,
        pickupGatePassId: pickupGatePassId || null,
        dropoffGatePassId: dropoffGatePassId || null,
        
        // Payment/card info
        paymentMode,
        platformFee,
        totalAmount: cardChargeAmount,
        cardNumber: cardNumber.replace(/\s/g, ''),
        cardFirstName: cardFirstName.trim(),
        cardLastName: cardLastName.trim(),
        cardExpiry: expiryDate,

        // ⭐ Cancellation policy acceptance (for legal proof/disputes)
        acceptedCancellationPolicy: true,
        acceptedCancellationPolicyAt: new Date().toISOString(),
        acceptedCancellationPolicyVersion: '2025-01-15-v2',
      };

      console.log('📤 Payment: Sending booking with card info');
      
      const response = await bookingApi.createBooking(bookingPayload, token);
      console.log('✅ Booking created:', response);
      
      sessionStorage.removeItem('shipperPortalDraftCache');
      
      const successMessage = paymentMode === 'full_card_charge'
        ? 'Your shipment request has been submitted!'
        : 'Your shipment request has been submitted!';
      
      navigate('/dashboard', {
        replace: true,
        state: {
          success: true,
          message: successMessage,
          bookingId: response.booking?.id || response.bookingId,
          showSuccessToast: true,
        },
      });
      
    } catch (error) {
      console.error('❌ Booking failed:', error);
      setErrors({ submit: error.message || 'Failed to process payment. Please try again.' });
      setIsProcessing(false);
    }
  };

  const handleBack = () => goToStep('confirm');

  if (isLoadingQuote) {
    return (
      <div className="sp-section sp-payment-section">
        <header className="sp-step-header">
          <div className="sp-step-icon-wrapper">
            <CreditCard size={24} strokeWidth={2} />
          </div>
          <div>
            <h3 className="sp-step-title">Payment Information</h3>
            <p className="sp-step-description">Loading quote details...</p>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="sp-section sp-payment-section">
      <header className="sp-step-header">
        <div className="sp-step-icon-wrapper">
          <CreditCard size={24} strokeWidth={2} />
        </div>
        <div>
          <h3 className="sp-step-title">Payment Information</h3>
          <p className="sp-step-description">
            Choose how you'd like to pay and add your payment method
          </p>
        </div>
      </header>

      <div className="sp-payment-content">
        <div className="sp-payment-grid">
          <section className="sp-card">
            <div className="sp-payment-mode-section">
              <h4 className="sp-payment-mode-title">
                How would you like to pay? <span className="sp-required">*</span>
              </h4>
              
              <div className="sp-payment-mode-options">
                <label className={`sp-payment-mode-option ${paymentMode === 'platform_fee_only' ? 'sp-payment-mode-option--active' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMode"
                    value="platform_fee_only"
                    checked={paymentMode === 'platform_fee_only'}
                    onChange={(e) => setPaymentMode(e.target.value)}
                  />
                  <div className="sp-payment-mode-content">
                    <div className="sp-payment-mode-icon">
                      <HandCoins size={18} strokeWidth={1.5} />
                    </div>
                    <div className="sp-payment-mode-details">
                      <div className="sp-payment-mode-label">Pay carrier directly</div>
                      <div className="sp-payment-mode-description">
                        Only the 3% platform fee is charged to your card.
                      </div>
                    </div>
                  </div>
                </label>

                <label className={`sp-payment-mode-option ${paymentMode === 'full_card_charge' ? 'sp-payment-mode-option--active' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMode"
                    value="full_card_charge"
                    checked={paymentMode === 'full_card_charge'}
                    onChange={(e) => setPaymentMode(e.target.value)}
                  />
                  <div className="sp-payment-mode-content">
                    <div className="sp-payment-mode-icon">
                      <CreditCard size={18} strokeWidth={1.5} />
                    </div>
                    <div className="sp-payment-mode-details">
                      <div className="sp-payment-mode-label">Pay full amount with card</div>
                      <div className="sp-payment-mode-description">
                        The entire cost will be charged when a carrier accepts.
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="sp-card-header sp-card-header-with-divider">
              <h4 className="sp-card-title">Card Details</h4>
              <div className="sp-header-badges">
                <div className="sp-security-badge-minimal">
                  <Lock size={13} />
                  <span>Secure</span>
                </div>
              </div>
            </div>

            <div className="sp-payment-notice-static">
              <div className="sp-notice-icon">
                <Info size={18} />
              </div>
              <div>
                <p className="sp-notice-title-minimal">You will not be charged immediately</p>
                <p className="sp-notice-text-static">
                  Your card will be charged only after a carrier accepts your offer.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="sp-form-group sp-form-group-compact">
                <label className="sp-label">Card Number <span className="sp-required">*</span></label>
                <input
                  type="text"
                  className={`sp-input ${errors.cardNumber ? 'sp-input--error' : ''}`}
                  placeholder="Enter Card Number"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  maxLength="19"
                />
                {errors.cardNumber && <span className="sp-error-text">{errors.cardNumber}</span>}
              </div>

              <div className="sp-form-grid">
                <div className="sp-form-group sp-form-group-compact">
                  <label className="sp-label">First Name <span className="sp-required">*</span></label>
                  <input
                    type="text"
                    className={`sp-input ${errors.cardFirstName ? 'sp-input--error' : ''}`}
                    placeholder="Enter First Name"
                    value={cardFirstName}
                    onChange={handleFirstNameChange}
                  />
                  {errors.cardFirstName && <span className="sp-error-text">{errors.cardFirstName}</span>}
                </div>

                <div className="sp-form-group sp-form-group-compact">
                  <label className="sp-label">Last Name <span className="sp-required">*</span></label>
                  <input
                    type="text"
                    className={`sp-input ${errors.cardLastName ? 'sp-input--error' : ''}`}
                    placeholder="Enter Last Name"
                    value={cardLastName}
                    onChange={handleLastNameChange}
                  />
                  {errors.cardLastName && <span className="sp-error-text">{errors.cardLastName}</span>}
                </div>
              </div>

              <div className="sp-form-grid sp-form-grid--payment">
                <div className="sp-form-group">
                  <label className="sp-label">Expiry Date <span className="sp-required">*</span></label>
                  <input
                    type="text"
                    className={`sp-input ${errors.expiryDate ? 'sp-input--error' : ''}`}
                    placeholder="MM/YY"
                    value={expiryDate}
                    onChange={handleExpiryChange}
                    maxLength="5"
                  />
                  {errors.expiryDate && <span className="sp-error-text">{errors.expiryDate}</span>}
                </div>

                <div className="sp-form-group">
                  <label className="sp-label">CVV <span className="sp-required">*</span></label>
                  <input
                    type="text"
                    className={`sp-input ${errors.cvv ? 'sp-input--error' : ''}`}
                    placeholder="CVV"
                    value={cvv}
                    onChange={handleCvvChange}
                    maxLength="4"
                  />
                  {errors.cvv && <span className="sp-error-text">{errors.cvv}</span>}
                </div>
              </div>

              {errors.submit && (
                <div className="sp-submit-error">{errors.submit}</div>
              )}
            </form>
          </section>

          <aside className="sp-order-summary-wrapper">
            <div className="sp-secure-payment-info">
              <h4 className="sp-secure-payment-title">Secure Payment</h4>
              <ul className="sp-secure-payment-list">
                <li>Your payment information is encrypted</li>
                <li>We never store your full card number</li>
                <li>All major credit cards accepted</li>
              </ul>
            </div>

            <div className="sp-summary-card-minimal sp-summary-card-aligned">
              <div className="sp-summary-header-clean">
                <h4 className="sp-summary-title-clean">Order Summary</h4>
              </div>

              <div className="sp-summary-content-minimal">
                <div className="sp-summary-row-minimal">
                  <span className="sp-summary-label-minimal">Carrier Offer</span>
                  <span className="sp-summary-value-minimal">${offerAmount.toFixed(2)}</span>
                </div>

                <div className="sp-summary-row-minimal sp-summary-row-highlight-softer">
                  <div className="sp-summary-label-with-note">
                    <span className="sp-summary-label-minimal">Platform Fee (3%)</span>
                    <span className="sp-summary-note-minimal">Charged when accepted</span>
                  </div>
                  <span className="sp-summary-value-minimal">${platformFee.toFixed(2)}</span>
                </div>

                <div className="sp-summary-caption-static">
                  {paymentMode === 'platform_fee_only' 
                    ? 'Only the platform fee will be charged.'
                    : 'The full amount will be charged.'}
                </div>

                <div className="sp-summary-divider-minimal"></div>
              </div>

              <div className="sp-summary-total-section">
                <div className="sp-summary-row-total-clean">
                  <span className="sp-summary-label-total">Charged to card</span>
                  <span className="sp-summary-value-total">${cardChargeAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="sp-summary-info-static">
                <p>Payment will be processed once a carrier accepts your shipment offer.</p>
              </div>

              <div className="sp-secure-badges-minimal">
                <div className="sp-secure-badge-item">
                  <Lock size={11} />
                  <span>256-bit SSL</span>
                </div>
                <div className="sp-secure-badge-item">
                  <span>PCI Compliant</span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Cancellation + waiting fee disclosure. Opens the full policy in a
            modal so typed-in card details are never lost to a route change. */}
        <div className="sp-cancellation-policy-section">
          <div className="sp-cancellation-policy-box">
            <div className="sp-cancellation-policy-header">
              <Info size={18} strokeWidth={2} />
              <span>Cancellation &amp; Waiting Fee Policy</span>
            </div>
            <div className="sp-cancellation-policy-content">
              <p className="sp-cancellation-intro">
                Fees scale with how far along the shipment is — cancel early and pay nothing; cancel once the carrier is on the road and a dispatch fee applies.
              </p>

              <ul className="sp-cancellation-policy-list">
                <li className="sp-cancellation-policy-item">
                  <strong>Before a carrier accepts:</strong> Free cancellation, full refund of platform fee.
                </li>
                <li className="sp-cancellation-policy-item">
                  <strong>After acceptance, before the carrier starts driving:</strong> You may cancel. 3% platform fee is non-refundable.
                </li>
                <li className="sp-cancellation-policy-item">
                  <strong>After the carrier has been dispatched:</strong> You may cancel. 3% platform fee non-refundable + $50 carrier dispatch fee.
                </li>
                <li className="sp-cancellation-policy-item">
                  <strong>After your vehicle is picked up:</strong> Normal cancellation is no longer available — contact support for emergencies.
                </li>
                <li className="sp-cancellation-policy-item">
                  <strong>Waiting fee:</strong> $50 only if the carrier is delayed over 60 minutes after the later of their arrival or your pickup window start.
                </li>
              </ul>

              <div className="sp-cancellation-scheduling-note">
                <p className="sp-scheduling-note-title">
                  <CalendarCheck size={14} strokeWidth={2} aria-hidden="true" />
                  <span>About appointments &amp; access</span>
                </p>
                <p className="sp-scheduling-note-text">
                  If pickup requires an appointment (auction, dealership, gated facility), provide gate-pass or appointment details in advance. If the carrier is turned away through no fault of your own, we'll reschedule at no extra charge.
                </p>
              </div>

              <label className="sp-cancellation-checkbox-label">
                <input
                  type="checkbox"
                  checked={acceptedCancellationPolicy}
                  onChange={(e) => {
                    setAcceptedCancellationPolicy(e.target.checked);
                    if (errors.cancellationPolicy) {
                      setErrors({ ...errors, cancellationPolicy: '' });
                    }
                  }}
                  className="sp-cancellation-checkbox"
                />
                <span className="sp-cancellation-checkbox-text">
                  I understand and agree to the cancellation and waiting-fee policy above.
                </span>
              </label>

              <button
                type="button"
                className="sp-cancellation-policy-link"
                onClick={() => setIsPolicyOpen(true)}
              >
                View full policy →
              </button>
            </div>
            {errors.cancellationPolicy && (
              <div className="sp-cancellation-error">{errors.cancellationPolicy}</div>
            )}
          </div>
        </div>

        <PolicyModal open={isPolicyOpen} onClose={() => setIsPolicyOpen(false)} />

        <div className="sp-actions">
          <button className="sp-btn sp-btn--secondary" onClick={handleBack} disabled={isProcessing}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Confirm
          </button>

          <div className="sp-primary-action-wrapper">
            <button 
              className="sp-btn sp-btn--primary" 
              onClick={handleSubmit} 
              disabled={isProcessing || !acceptedCancellationPolicy}
            >
              {isProcessing ? (
                <><span className="sp-btn-spinner" />Processing...</>
              ) : (
                <>Complete Booking</>
              )}
            </button>
            {!isProcessing && (
              <span className="sp-btn-reassurance">
                You won't be charged yet.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}