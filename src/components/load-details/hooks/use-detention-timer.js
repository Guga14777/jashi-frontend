// ============================================================
// FILE: src/components/load-details/hooks/use-detention-timer.js
// Hook for detention/waiting fee timer logic
// ============================================================

import { useState, useEffect, useMemo, useCallback } from 'react';

/**
 * Waiting fee threshold in minutes (60 minutes = 1 hour)
 */
export const WAITING_FEE_THRESHOLD_MINUTES = 60;

/**
 * Waiting fee amount in dollars
 */
export const WAITING_FEE_AMOUNT = 50;

/**
 * Parse a time-of-day string ("8:00 AM", "09:30", "9:30 pm") into {hours, minutes}.
 */
const parseTimeString = (timeStr) => {
  if (!timeStr) return null;
  const s = String(timeStr).trim();
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]m)?$/i);
  if (!m) return null;
  let hours = parseInt(m[1], 10);
  const minutes = m[2] ? parseInt(m[2], 10) : 0;
  const meridian = m[3] ? m[3].toLowerCase() : null;
  if (meridian === 'pm' && hours !== 12) hours += 12;
  if (meridian === 'am' && hours === 12) hours = 0;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
};

const combineDateAndTime = (date, timeStr) => {
  if (!date || !timeStr) return null;
  const parsed = parseTimeString(timeStr);
  if (!parsed) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  d.setHours(parsed.hours, parsed.minutes, 0, 0);
  return d;
};

/**
 * Effective wait-timer start = max(carrier arrival time, pickup window start).
 *
 * If the carrier arrives before the customer's selected pickup window, the
 * timer does NOT start counting until the window begins. This is the fairness
 * rule — the customer shouldn't be charged for the carrier's own early arrival.
 */
export const calculateWaitTimerStart = (load) => {
  if (!load) return null;
  const arrivedAt = load.arrivedAtPickupAt || load.waitTimerStartAt;
  if (!arrivedAt) return null;

  const arrived = new Date(arrivedAt);
  if (isNaN(arrived.getTime())) return null;

  const windowStart = combineDateAndTime(load.pickupDate, load.pickupWindowStart);
  if (!windowStart || isNaN(windowStart.getTime())) return arrived;

  return arrived.getTime() >= windowStart.getTime() ? arrived : windowStart;
};

/**
 * Calculate waiting minutes from a start time
 * @param {Date|string} startTime - When waiting started
 * @param {Date|string} endTime - When waiting ended (or now if ongoing)
 * @returns {number} - Minutes waited
 */
export const calculateWaitingMinutes = (startTime, endTime = null) => {
  if (!startTime) return 0;
  
  try {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    
    if (isNaN(start.getTime())) return 0;
    if (isNaN(end.getTime())) return 0;
    
    const diffMs = end.getTime() - start.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60)));
  } catch {
    return 0;
  }
};

/**
 * Check if waiting fee is eligible based on time
 * @param {number} waitingMinutes - Minutes waited
 * @returns {boolean} - Whether fee is eligible
 */
export const isWaitingFeeEligible = (waitingMinutes) => {
  return waitingMinutes >= WAITING_FEE_THRESHOLD_MINUTES;
};

/**
 * Format waiting time for display
 * @param {number} minutes - Minutes waited
 * @returns {string} - Formatted time string
 */
export const formatWaitingTime = (minutes) => {
  if (!minutes || minutes <= 0) return '0:00';
  
  const mins = Math.floor(minutes);
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  
  if (hours > 0) {
    return `${hours}:${remainingMins.toString().padStart(2, '0')}`;
  }
  
  return `0:${mins.toString().padStart(2, '0')}`;
};

/**
 * Hook for detention/waiting timer
 * @param {Object} options - Timer options
 * @returns {Object} - Timer state and controls
 */
export const useDetentionTimer = ({
  arrivedAtPickupAt,
  pickedUpAt,
  pickupDate,
  pickupWindowStart,
  waitFeeRequestedAt,
  waitFeeAmount,
  enabled = true,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Timer start = max(arrivedAtPickupAt, pickupWindowStart on pickupDate).
  // Aligns with backend server/services/booking/booking.helpers.cjs.
  const timerStart = useMemo(() => {
    return calculateWaitTimerStart({ arrivedAtPickupAt, pickupDate, pickupWindowStart });
  }, [arrivedAtPickupAt, pickupDate, pickupWindowStart]);
  
  // Calculate timer end (pickup time or still running)
  const timerEnd = useMemo(() => {
    if (pickedUpAt) {
      try {
        const date = new Date(pickedUpAt);
        return isNaN(date.getTime()) ? null : date;
      } catch {
        return null;
      }
    }
    return null; // Still running
  }, [pickedUpAt]);
  
  // Is timer actively running?
  const isRunning = timerStart && !timerEnd && enabled;
  
  // Update current time every second if running
  useEffect(() => {
    if (!isRunning) return;
    
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isRunning]);
  
  // Calculate waiting minutes
  const waitingMinutes = useMemo(() => {
    if (!timerStart) return 0;
    const endTime = timerEnd || currentTime;
    return calculateWaitingMinutes(timerStart, endTime);
  }, [timerStart, timerEnd, currentTime]);
  
  // Calculate waiting seconds (for more precise display)
  const waitingSeconds = useMemo(() => {
    if (!timerStart) return 0;
    const endTime = timerEnd || currentTime;
    try {
      const diffMs = endTime.getTime() - timerStart.getTime();
      return Math.max(0, Math.floor(diffMs / 1000));
    } catch {
      return 0;
    }
  }, [timerStart, timerEnd, currentTime]);
  
  // Is fee eligible?
  const isEligible = waitingMinutes >= WAITING_FEE_THRESHOLD_MINUTES;
  
  // Has fee been requested?
  const isRequested = !!waitFeeRequestedAt;
  
  // Minutes until eligible
  const minutesUntilEligible = Math.max(0, WAITING_FEE_THRESHOLD_MINUTES - waitingMinutes);
  
  // Progress percentage (0-100)
  const progressPercent = Math.min(100, (waitingMinutes / WAITING_FEE_THRESHOLD_MINUTES) * 100);
  
  // Format display time
  const displayTime = useMemo(() => {
    const hours = Math.floor(waitingSeconds / 3600);
    const mins = Math.floor((waitingSeconds % 3600) / 60);
    const secs = waitingSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [waitingSeconds]);
  
  return {
    // Timer state
    timerStart,
    timerEnd,
    isRunning,
    
    // Time values
    waitingMinutes,
    waitingSeconds,
    displayTime,
    
    // Fee state
    isEligible,
    isRequested,
    feeAmount: waitFeeAmount || WAITING_FEE_AMOUNT,
    
    // Progress
    minutesUntilEligible,
    progressPercent,
    thresholdMinutes: WAITING_FEE_THRESHOLD_MINUTES,
  };
};

export default useDetentionTimer;