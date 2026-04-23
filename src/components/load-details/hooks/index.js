// ============================================================
// FILE: src/components/load-details/hooks/index.js
// Barrel export for load-details hooks
// ============================================================

export { useLoadDetailsState } from './use-load-details-state';
export { 
  useDetentionTimer,
  WAITING_FEE_THRESHOLD_MINUTES,
  WAITING_FEE_AMOUNT,
  calculateWaitTimerStart,
  calculateWaitingMinutes,
  isWaitingFeeEligible,
  formatWaitingTime,
} from './use-detention-timer';