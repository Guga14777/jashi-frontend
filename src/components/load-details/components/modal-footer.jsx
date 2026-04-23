// ============================================================
// FILE: src/components/load-details/components/modal-footer.jsx
// Modal footer with action buttons
// ✅ FIXED: Removed redundant "Close" button per Issue #8
// The modal already has X button on top right and can be closed by clicking outside
// ============================================================

import React from 'react';
import { XCircleIcon } from './icons';

const ModalFooter = ({
  canCancel,
  canEdit,
  isCarrier,
  onCancelClick,
  onEditClick,
  onClose,
  onAccept,
  isQuote,
  load,
  acceptDisabled,
  acceptLoading,
}) => {
  const hasActions = canCancel || canEdit || (onAccept && isCarrier && !isQuote);

  if (!hasActions) {
    return null;
  }

  return (
    <div className="ldm-footer">
      {canCancel && (
        <button
          className="ldm-btn ldm-btn--cancel"
          onClick={onCancelClick}
        >
          <XCircleIcon />
          {isCarrier ? 'Cancel Load' : 'Cancel Shipment'}
        </button>
      )}

      {canEdit && onEditClick && (
        <button
          className="ldm-btn"
          onClick={onEditClick}
          type="button"
        >
          Edit Shipment
        </button>
      )}

      {/* Spacer to push accept button to the right */}
      <div style={{ flex: 1 }} />

      {/* Accept Load button for carriers viewing available loads */}
      {onAccept && isCarrier && !isQuote && (
        <button
          className="ldm-btn ldm-btn--primary"
          onClick={() => onAccept(load)}
          disabled={acceptDisabled || acceptLoading}
        >
          {acceptLoading ? 'Accepting…' : 'Accept Load'}
        </button>
      )}
    </div>
  );
};

export default ModalFooter;