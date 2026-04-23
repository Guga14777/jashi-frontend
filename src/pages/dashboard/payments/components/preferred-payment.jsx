import React, { useRef, useMemo } from "react";
import "./preferred-payment.css";
import { formatCurrency, formatDate } from "../../../../utils/formatters";

// Message map for i18n readiness
const messages = {
  title: "Preferred Payment Method",
  subtitle: "Choose which saved card will be used by default at checkout.",
  expires: "Expires",
  expired: "Expired",
  defaultChip: "DEFAULT",
  remove: "Remove",
  emptyTitle: "No saved cards yet",
  emptyDesc: "Add a card to set your preferred payment method. You can change it anytime.",
  addCardEmpty: "Add New Card",
  addCardLink: "Add New Card",
  cardExpiredNote: "This card is expired and cannot be selected",
  removeConfirmNote: "This will trigger a confirmation dialog"
};

/**
 * cards: Array of:
 * {
 *   id: string|number,
 *   brand: string,          // e.g., 'Visa', 'Mastercard'
 *   last4: string,          // e.g., '4242'
 *   exp: string,            // e.g., '04/27'
 *   isDefault: boolean,
 *   isExpired?: boolean     // optional
 * }
 *
 * Props:
 * - onSetDefault(cardId): required
 * - onAddCard(): required
 * - onRemoveCard?(cardId): optional
 */
export default function PreferredPayment({
  cards = [],
  onSetDefault,
  onAddCard,
  onRemoveCard,
}) {
  const liveRegionRef = useRef(null);
  const addCardButtonRef = useRef(null);
  const fieldsetRef = useRef(null);

  // Derive expiration if not provided
  const normalizedCards = useMemo(() => {
    const now = new Date();
    const cy = now.getFullYear() % 100;
    const cm = now.getMonth() + 1;
    return cards.map((c) => {
      if (typeof c.isExpired === "boolean") return c;
      // c.exp format "MM/YY"
      const [mmStr, yyStr] = String(c.exp || "").split("/");
      const mm = parseInt(mmStr, 10);
      const yy = parseInt(yyStr, 10);
      const expired =
        Number.isFinite(mm) && Number.isFinite(yy)
          ? (yy < cy) || (yy === cy && mm < cm)
          : false;
      return { ...c, isExpired: expired };
    });
  }, [cards]);

  const handleCardSelect = (cardId) => {
    const selectedCard = normalizedCards.find(card => card.id === cardId);
    if (selectedCard && !selectedCard.isExpired && typeof onSetDefault === "function") {
      onSetDefault(cardId);
      
      // Optional: announce default change for SR users
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = `${selectedCard.brand} ending in ${selectedCard.last4} set as default`;
        setTimeout(() => { if (liveRegionRef.current) liveRegionRef.current.textContent = ""; }, 1200);
      }
    }
  };

  const handleRemoveCard = (cardId, event) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (typeof onRemoveCard === "function") {
      // Note: This should trigger a confirmation modal in real implementation
      onRemoveCard(cardId);
    }
  };

  const generateStableId = (cardId) => {
    return String(cardId).replace(/[^a-zA-Z0-9-_]/g, "-");
  };

  const hasCards = Array.isArray(normalizedCards) && normalizedCards.length > 0;
  const isAtCardLimit = normalizedCards.length >= 2;

  return (
    <div className="pp-container" data-testid="preferred-payment">
      <div className="pp-header">
        <h2 id="pp-title" className="pp-title">
          {messages.title}
        </h2>
        <p className="pp-subtitle">
          {messages.subtitle}
        </p>
      </div>

      {hasCards ? (
        <fieldset
          className="pp-fieldset"
          ref={fieldsetRef}
          data-testid="pp-card-group"
          role="radiogroup"
          aria-labelledby="pp-title"
        >
          <legend className="visually-hidden">{messages.title}</legend>
          
          <div className="pp-grid">
            {normalizedCards.map((card) => {
              const isSelected = !!card.isDefault;
              const isExpired = !!card.isExpired;
              const stableId = generateStableId(card.id);
              const inputId = `pp-card-${stableId}`;
              const expiredNoteId = `pp-expired-${stableId}`;

              return (
                <div
                  key={inputId}
                  className={[
                    "pp-card",
                    isSelected ? "pp-card--selected" : "",
                    isExpired ? "pp-card--expired" : "",
                  ].join(" ").trim()}
                  data-testid={`pp-card-row-${stableId}`}
                >
                  <label
                    htmlFor={inputId}
                    className="pp-card-label-wrapper"
                  >
                    <input
                      id={inputId}
                      type="radio"
                      name="preferred-card"
                      checked={isSelected}
                      onChange={() => handleCardSelect(card.id)}
                      className="pp-card-radio"
                      data-testid={`pp-card-input-${stableId}`}
                      aria-describedby={isExpired ? expiredNoteId : undefined}
                      disabled={isExpired}
                    />

                    <div className="pp-card-content">
                      <div className="pp-card-info">
                        <div className="pp-card-name" title={`${card.brand} ending in ${card.last4}`}>
                          {card.brand} ending in ••••{card.last4}
                        </div>

                        <div className="pp-card-meta">
                          <span className="pp-card-exp">
                            {isExpired ? messages.expired : messages.expires} {card.exp}
                          </span>

                          {isExpired && (
                            <>
                              <span className="pp-chip pp-chip--error" aria-label="Card expired">
                                {messages.expired.toUpperCase()}
                              </span>
                              <span id={expiredNoteId} className="visually-hidden">
                                {messages.cardExpiredNote}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="pp-card-controls">
                        <div className="pp-default-chip-area">
                          {isSelected && (
                            <div className="pp-default-chip" aria-label="Default payment method">
                              {messages.defaultChip}
                            </div>
                          )}
                        </div>

                        <div className="pp-radio-indicator">
                          <div
                            className={[
                              "pp-radio-dot",
                              isSelected ? "pp-radio-dot--checked" : "",
                              isExpired ? "pp-radio-dot--disabled" : "",
                            ].join(" ").trim()}
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                    </div>
                  </label>

                  {typeof onRemoveCard === "function" && (
                    <div className="pp-card-actions">
                      <button
                        type="button"
                        className="pp-remove-btn"
                        onClick={(e) => handleRemoveCard(card.id, e)}
                        aria-label={`Remove ${card.brand} ending in ${card.last4}`}
                        title={messages.removeConfirmNote}
                        data-testid={`pp-remove-btn-${stableId}`}
                      >
                        {messages.remove}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
      ) : (
        <div className="pp-empty" data-testid="pp-empty-state">
          <div className="pp-empty-content">
            <div className="pp-empty-title">{messages.emptyTitle}</div>
            <p className="pp-empty-desc">
              {messages.emptyDesc}
            </p>
            <button
              type="button"
              onClick={onAddCard}
              className="pp-btn pp-btn--primary"
              data-testid="pp-add-card-empty"
              ref={addCardButtonRef}
            >
              {messages.addCardEmpty}
            </button>
          </div>
        </div>
      )}

      <div className="pp-actions">
        {isAtCardLimit ? (
          <div className="pp-limit-notice">
            <span className="pp-limit-text">
              You've saved the maximum of 2 cards. Remove one to add another.
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onAddCard}
            className="pp-add-card-link"
            data-testid="pp-add-card-link"
          >
            {messages.addCardLink}
          </button>
        )}
      </div>

      {/* Live region for state announcements */}
      <div 
        ref={liveRegionRef}
        className="visually-hidden" 
        role="status" 
        aria-live="polite"
        aria-atomic="true"
      ></div>
    </div>
  );
}