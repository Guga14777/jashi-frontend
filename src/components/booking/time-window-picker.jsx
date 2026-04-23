// ============================================================
// FILE: src/components/booking/time-window-picker.jsx
// ✅ Clean, reusable residential time-window picker
// ✅ Supports preset windows, custom range, early arrival checkbox
// ✅ Returns normalized { windowStart, windowEnd, allowEarlyArrival }
// ============================================================

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import './time-window-picker.css';

// ============================================================
// CONSTANTS
// ============================================================

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const HOUR_OPTIONS = ['12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];
const MINUTE_OPTIONS = ['00', '15', '30', '45'];
const PERIOD_OPTIONS = ['AM', 'PM'];

// Preset residential time windows
const PRESET_WINDOWS = [
  {
    id: '8-10',
    label: '8:00 AM – 10:00 AM',
    sublabel: 'Early Morning',
    startMinutes: 480,  // 8:00 AM
    endMinutes: 600,    // 10:00 AM
  },
  {
    id: '10-12',
    label: '10:00 AM – 12:00 PM',
    sublabel: 'Late Morning',
    startMinutes: 600,  // 10:00 AM
    endMinutes: 720,    // 12:00 PM
  },
  {
    id: '12-14',
    label: '12:00 PM – 2:00 PM',
    sublabel: 'Early Afternoon',
    startMinutes: 720,  // 12:00 PM
    endMinutes: 840,    // 2:00 PM
  },
  {
    id: '14-16',
    label: '2:00 PM – 4:00 PM',
    sublabel: 'Afternoon',
    startMinutes: 840,  // 2:00 PM
    endMinutes: 960,    // 4:00 PM
  },
  {
    id: '16-18',
    label: '4:00 PM – 6:00 PM',
    sublabel: 'Late Afternoon',
    startMinutes: 960,  // 4:00 PM
    endMinutes: 1080,   // 6:00 PM
  },
  {
    id: 'flexible',
    label: 'Flexible',
    sublabel: 'Any time works',
    startMinutes: 0,    // 12:00 AM
    endMinutes: 1439,   // 11:59 PM
  },
];

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Parse time string (e.g., "08:30 AM") to minutes since midnight
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3] ? match[3].toUpperCase() : '';

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Format minutes since midnight to time string (e.g., "08:30 AM")
 */
function formatMinutesToTime(totalMinutes) {
  if (totalMinutes === null || totalMinutes === undefined) return '';

  const normalizedMinutes = totalMinutes % 1440;
  let hours24 = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;

  let period = 'AM';
  if (hours24 >= 12) {
    period = 'PM';
    if (hours24 > 12) hours24 -= 12;
  }
  if (hours24 === 0) hours24 = 12;

  const hourStr = String(hours24).padStart(2, '0');
  const minuteStr = String(minutes).padStart(2, '0');
  return `${hourStr}:${minuteStr} ${period}`;
}

/**
 * Format hour, minute, period to time string
 */
function formatTime(hour, minute, period) {
  if (!hour || !minute || !period) return '';
  return `${hour}:${minute} ${period}`;
}

/**
 * Parse time string to components
 */
function parseTimeComponents(timeStr) {
  if (!timeStr) return { hour: '08', minute: '00', period: 'AM' };
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return { hour: '08', minute: '00', period: 'AM' };
  return {
    hour: match[1].padStart(2, '0'),
    minute: match[2],
    period: match[3] ? match[3].toUpperCase() : 'AM',
  };
}

/**
 * Format ISO date to display format (MM/DD/YYYY)
 */
function formatDisplayDate(isoDateString) {
  if (!isoDateString) return '';
  const date = new Date(`${isoDateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDateString;
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/**
 * Get today's date in ISO format
 */
function getTodayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

// Minimum gap (minutes) between earliest possible delivery moment and the
// START of any window the customer may select. Prevents degenerate selections
// like pickup 10–12 PM, delivery same-day 10–12 PM (window starts at the
// floor, leaves no realistic prep/transit margin).
const MIN_BUFFER_MINUTES = 60;

export default function TimeWindowPicker({
  label = 'Select Time Window',
  value = {},
  onChange,
  errors = {},
  minDate,
  minStartMinutes = null,
  disabled = false,
}) {
  // When the customer picks the floor date, time-of-day matters: any window
  // whose START is earlier than `floor + buffer` is unusable. Only enforced
  // when the selected date equals minDate.
  const enforceMinStart = Number.isFinite(minStartMinutes) && value?.date && value.date === minDate;
  const effectiveMinStart = enforceMinStart ? (minStartMinutes + MIN_BUFFER_MINUTES) : null;
  // ============================================================
  // STATE
  // ============================================================

  const today = useMemo(() => getTodayISO(), []);
  const effectiveMinDate = minDate && minDate > today ? minDate : today;

  // Calendar state
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const calendarRef = useRef(null);

  // Custom time state
  const initialFrom = parseTimeComponents(value?.customFrom || '');
  const initialTo = parseTimeComponents(value?.customTo || '');

  const [customFromHour, setCustomFromHour] = useState(initialFrom.hour);
  const [customFromMinute, setCustomFromMinute] = useState(initialFrom.minute);
  const [customFromPeriod, setCustomFromPeriod] = useState(initialFrom.period);

  const [customToHour, setCustomToHour] = useState(initialTo.hour);
  const [customToMinute, setCustomToMinute] = useState(initialTo.minute);
  const [customToPeriod, setCustomToPeriod] = useState(initialTo.period);

  const [timeError, setTimeError] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);

  // Derived state
  const hasCustomTime = Boolean(value?.customFrom && value?.customTo);
  const hasPresetWindow = Boolean(value?.presetId && !hasCustomTime);
  const allowEarlyArrival = Boolean(value?.allowEarlyArrival);

  // ============================================================
  // EFFECTS
  // ============================================================

  // Close calendar on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCalendar]);

  // Sync custom time inputs with value prop
  useEffect(() => {
    if (value?.customFrom) {
      const parsed = parseTimeComponents(value.customFrom);
      setCustomFromHour(parsed.hour);
      setCustomFromMinute(parsed.minute);
      setCustomFromPeriod(parsed.period);
    }
    if (value?.customTo) {
      const parsed = parseTimeComponents(value.customTo);
      setCustomToHour(parsed.hour);
      setCustomToMinute(parsed.minute);
      setCustomToPeriod(parsed.period);
    }
  }, [value?.customFrom, value?.customTo]);

  // Validate custom time
  useEffect(() => {
    if (!hasInteracted || !hasCustomTime) {
      setTimeError('');
      return;
    }

    const fromTime = formatTime(customFromHour, customFromMinute, customFromPeriod);
    const toTime = formatTime(customToHour, customToMinute, customToPeriod);
    const fromMinutes = parseTimeToMinutes(fromTime);
    const toMinutes = parseTimeToMinutes(toTime);

    if (toMinutes <= fromMinutes) {
      setTimeError('End time must be later than start time.');
    } else if (fromMinutes < 360 || toMinutes > 1260) {
      // Outside 6 AM - 9 PM bounds
      setTimeError('Please select a time between 6:00 AM and 9:00 PM.');
    } else if (enforceMinStart && fromMinutes < effectiveMinStart) {
      const h24 = Math.floor(effectiveMinStart / 60);
      const m = effectiveMinStart % 60;
      const period = h24 >= 12 ? 'PM' : 'AM';
      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
      setTimeError(`Start time must be at or after ${h12}:${String(m).padStart(2, '0')} ${period} (earliest delivery + ${MIN_BUFFER_MINUTES} min buffer).`);
    } else {
      setTimeError('');
    }
  }, [
    hasInteracted,
    hasCustomTime,
    customFromHour,
    customFromMinute,
    customFromPeriod,
    customToHour,
    customToMinute,
    customToPeriod,
    enforceMinStart,
    effectiveMinStart,
  ]);

  // ============================================================
  // HELPERS
  // ============================================================

  /**
   * Build normalized output and call onChange
   */
  const emitChange = useCallback((updates) => {
    const newValue = { ...value, ...updates };

    // Calculate normalized windowStart/windowEnd
    let windowStart = null;
    let windowEnd = null;

    if (newValue.customFrom && newValue.customTo) {
      windowStart = parseTimeToMinutes(newValue.customFrom);
      windowEnd = parseTimeToMinutes(newValue.customTo);
    } else if (newValue.presetId) {
      const preset = PRESET_WINDOWS.find(p => p.id === newValue.presetId);
      if (preset) {
        windowStart = preset.startMinutes;
        windowEnd = preset.endMinutes;
      }
    }

    onChange({
      ...newValue,
      windowStart,
      windowEnd,
      // Formatted strings for display
      windowStartFormatted: windowStart !== null ? formatMinutesToTime(windowStart) : null,
      windowEndFormatted: windowEnd !== null ? formatMinutesToTime(windowEnd) : null,
    });
  }, [value, onChange]);

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleDateSelect = (dateStr) => {
    emitChange({ date: dateStr });
    setShowCalendar(false);
  };

  const handlePresetClick = (presetId) => {
    if (value?.presetId === presetId) {
      // Deselect
      emitChange({ presetId: '', customFrom: '', customTo: '' });
    } else {
      // Select preset, clear custom
      emitChange({ presetId, customFrom: '', customTo: '' });
      // Reset custom inputs
      setCustomFromHour('08');
      setCustomFromMinute('00');
      setCustomFromPeriod('AM');
      setCustomToHour('10');
      setCustomToMinute('00');
      setCustomToPeriod('AM');
      setTimeError('');
      setHasInteracted(false);
    }
  };

  const handleAllowEarlyArrivalChange = (e) => {
    emitChange({ allowEarlyArrival: e.target.checked });
  };

  const clearCustomTime = () => {
    setCustomFromHour('08');
    setCustomFromMinute('00');
    setCustomFromPeriod('AM');
    setCustomToHour('10');
    setCustomToMinute('00');
    setCustomToPeriod('AM');
    setTimeError('');
    setHasInteracted(false);
    emitChange({ customFrom: '', customTo: '' });
  };

  // Custom time dropdown handlers
  const updateCustomTime = (field, val) => {
    setHasInteracted(true);

    let newFrom = { hour: customFromHour, minute: customFromMinute, period: customFromPeriod };
    let newTo = { hour: customToHour, minute: customToMinute, period: customToPeriod };

    switch (field) {
      case 'fromHour': newFrom.hour = val; setCustomFromHour(val); break;
      case 'fromMinute': newFrom.minute = val; setCustomFromMinute(val); break;
      case 'fromPeriod': newFrom.period = val; setCustomFromPeriod(val); break;
      case 'toHour': newTo.hour = val; setCustomToHour(val); break;
      case 'toMinute': newTo.minute = val; setCustomToMinute(val); break;
      case 'toPeriod': newTo.period = val; setCustomToPeriod(val); break;
    }

    const fromTime = formatTime(newFrom.hour, newFrom.minute, newFrom.period);
    const toTime = formatTime(newTo.hour, newTo.minute, newTo.period);

    // Clear preset when using custom
    emitChange({ presetId: '', customFrom: fromTime, customTo: toTime });
  };

  // Calendar navigation
  const goToPreviousMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const goToToday = () => {
    const baseDate = new Date(`${effectiveMinDate}T00:00:00`);
    setCalendarMonth(baseDate.getMonth());
    setCalendarYear(baseDate.getFullYear());
    handleDateSelect(effectiveMinDate);
  };

  // ============================================================
  // CALENDAR GENERATION
  // ============================================================

  const generateCalendarDays = () => {
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calendarYear, calendarMonth, 0).getDate();
    const days = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, isCurrentMonth: false });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const year = calendarYear;
      const month = String(calendarMonth + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayStr}`;
      const isPast = dateStr < effectiveMinDate;

      days.push({
        day,
        isCurrentMonth: true,
        isToday: dateStr === today,
        isSelected: value?.date === dateStr,
        isPast,
        dateStr,
      });
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({ day, isCurrentMonth: false });
    }

    return days;
  };

  // ============================================================
  // RENDER
  // ============================================================

  const formattedDate = formatDisplayDate(value?.date);

  return (
    <section className={`twp-card ${disabled ? 'twp-card--disabled' : ''}`}>
      {/* Header */}
      <div className="twp-header">
        <h4 className="twp-title">{label}</h4>
        <p className="twp-subtitle">Select your preferred date and time window</p>
      </div>

      <div className="twp-content">
        {/* Date Picker */}
        <div className="twp-field">
          <label className="twp-label">
            <Calendar size={14} />
            Preferred Date <span className="twp-required">*</span>
          </label>
          {errors.date && <span className="twp-error-text">{errors.date}</span>}

          <div className="twp-calendar-wrapper" ref={calendarRef}>
            <input
              type="text"
              className={`twp-input ${errors.date ? 'twp-input--error' : ''}`}
              value={formattedDate}
              placeholder="Select date"
              onClick={() => !disabled && setShowCalendar(!showCalendar)}
              readOnly
              disabled={disabled}
            />

            {showCalendar && (
              <div className="twp-calendar-dropdown">
                <div className="twp-cal-header">
                  <button type="button" onClick={goToPreviousMonth} className="twp-cal-nav-btn">
                    <ChevronLeft size={18} />
                  </button>
                  <span className="twp-cal-month-year">
                    {MONTH_NAMES[calendarMonth]} {calendarYear}
                  </span>
                  <button type="button" onClick={goToNextMonth} className="twp-cal-nav-btn">
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="twp-cal-grid">
                  {DAYS.map((day) => (
                    <div key={day} className="twp-cal-day-header">{day}</div>
                  ))}
                  {generateCalendarDays().map((dayObj, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={[
                        'twp-cal-day',
                        !dayObj.isCurrentMonth && 'twp-cal-day--other',
                        dayObj.isToday && 'twp-cal-day--today',
                        dayObj.isSelected && 'twp-cal-day--selected',
                        dayObj.isPast && 'twp-cal-day--past',
                      ].filter(Boolean).join(' ')}
                      onClick={() => dayObj.isCurrentMonth && !dayObj.isPast && handleDateSelect(dayObj.dateStr)}
                      disabled={dayObj.isPast || !dayObj.isCurrentMonth}
                    >
                      {dayObj.day}
                    </button>
                  ))}
                </div>

                <div className="twp-cal-footer">
                  <button type="button" onClick={() => setShowCalendar(false)} className="twp-cal-btn">
                    Close
                  </button>
                  <button type="button" onClick={goToToday} className="twp-cal-btn twp-cal-btn--primary">
                    Today
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preset Time Windows */}
        <div className="twp-field">
          <label className="twp-label">
            <Clock size={14} />
            Preferred Time Window <span className="twp-required">*</span>
          </label>
          {errors.time && <span className="twp-error-text">{errors.time}</span>}

          <div className="twp-time-slots">
            {PRESET_WINDOWS.map((preset) => {
              const isActive = value?.presetId === preset.id;
              // "Flexible" is exempt from the start-time floor — it explicitly
              // means the customer doesn't require a specific time.
              const tooEarly = enforceMinStart
                && preset.id !== 'flexible'
                && preset.startMinutes < effectiveMinStart;
              const isDisabled = hasCustomTime || disabled || tooEarly;

              return (
                <button
                  key={preset.id}
                  type="button"
                  className={[
                    'twp-time-slot',
                    isActive && 'twp-time-slot--active',
                    isDisabled && 'twp-time-slot--disabled',
                  ].filter(Boolean).join(' ')}
                  onClick={() => !isDisabled && handlePresetClick(preset.id)}
                  disabled={isDisabled}
                  title={tooEarly ? 'Earlier than the earliest possible delivery time on this date.' : undefined}
                >
                  <span className="twp-time-slot-time">{preset.label}</span>
                  <span className="twp-time-slot-label">{preset.sublabel}</span>
                  {isActive && (
                    <span className="twp-time-slot-check">
                      <Check size={16} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {enforceMinStart && (
            <p className="twp-hint">
              Windows must start at or after {(() => {
                const h24 = Math.floor(effectiveMinStart / 60);
                const m = effectiveMinStart % 60;
                const period = h24 >= 12 ? 'PM' : 'AM';
                const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
                return `${h12}:${String(m).padStart(2, '0')} ${period}`;
              })()} on this date (earliest delivery + {MIN_BUFFER_MINUTES} min buffer).
            </p>
          )}

          {hasCustomTime && (
            <p className="twp-hint">
              Custom time range is active. Clear it to select a preset window.
            </p>
          )}
        </div>

        {/* Custom Time Range */}
        <div className="twp-field">
          <div className="twp-custom-header">
            <label className="twp-label">Or choose a custom time range</label>
            {hasCustomTime && (
              <button type="button" className="twp-clear-btn" onClick={clearCustomTime}>
                <X size={14} />
                Clear
              </button>
            )}
          </div>

          {timeError && hasInteracted && (
            <div className="twp-error-banner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" strokeLinecap="round"/>
                <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>{timeError}</span>
            </div>
          )}

          <div className={`twp-time-grid ${hasPresetWindow || disabled ? 'twp-time-grid--disabled' : ''}`}>
            {/* FROM */}
            <div className="twp-time-block">
              <span className="twp-time-label">FROM</span>
              <div className="twp-time-selects">
                <select
                  className="twp-select"
                  value={customFromHour}
                  onChange={(e) => updateCustomTime('fromHour', e.target.value)}
                  disabled={hasPresetWindow || disabled}
                >
                  {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className="twp-colon">:</span>
                <select
                  className="twp-select"
                  value={customFromMinute}
                  onChange={(e) => updateCustomTime('fromMinute', e.target.value)}
                  disabled={hasPresetWindow || disabled}
                >
                  {MINUTE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select
                  className="twp-select twp-select--period"
                  value={customFromPeriod}
                  onChange={(e) => updateCustomTime('fromPeriod', e.target.value)}
                  disabled={hasPresetWindow || disabled}
                >
                  {PERIOD_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* TO */}
            <div className="twp-time-block">
              <span className="twp-time-label">TO</span>
              <div className="twp-time-selects">
                <select
                  className="twp-select"
                  value={customToHour}
                  onChange={(e) => updateCustomTime('toHour', e.target.value)}
                  disabled={hasPresetWindow || disabled}
                >
                  {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className="twp-colon">:</span>
                <select
                  className="twp-select"
                  value={customToMinute}
                  onChange={(e) => updateCustomTime('toMinute', e.target.value)}
                  disabled={hasPresetWindow || disabled}
                >
                  {MINUTE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select
                  className="twp-select twp-select--period"
                  value={customToPeriod}
                  onChange={(e) => updateCustomTime('toPeriod', e.target.value)}
                  disabled={hasPresetWindow || disabled}
                >
                  {PERIOD_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          {hasPresetWindow && (
            <p className="twp-hint">Custom range disabled while a preset is selected.</p>
          )}
        </div>

        {/* Allow Early Arrival Checkbox */}
        <div className="twp-field">
          <label className="twp-checkbox-label">
            <input
              type="checkbox"
              className="twp-checkbox"
              checked={allowEarlyArrival}
              onChange={handleAllowEarlyArrivalChange}
              disabled={disabled}
            />
            <span className="twp-checkbox-box">
              {allowEarlyArrival && <Check size={14} />}
            </span>
            <span className="twp-checkbox-text">
              <strong>Allow early arrival</strong>
              <span className="twp-checkbox-subtext">
                Carrier may arrive up to 2 hours before the scheduled window
              </span>
            </span>
          </label>
        </div>

        {/* Info Box */}
        <div className="twp-info-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <path d="M12 16v-4M12 8h.01" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p>
            Selecting a specific time window helps carriers coordinate more efficiently.
            {allowEarlyArrival && ' With early arrival enabled, expect arrival up to 2 hours before your window.'}
          </p>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// PROP TYPES (for documentation)
// ============================================================

/**
 * @typedef {Object} TimeWindowValue
 * @property {string} date - ISO date string (YYYY-MM-DD)
 * @property {string} presetId - ID of selected preset window
 * @property {string} customFrom - Custom start time (e.g., "08:00 AM")
 * @property {string} customTo - Custom end time (e.g., "10:00 AM")
 * @property {boolean} allowEarlyArrival - Allow arrival up to 2 hours early
 * @property {number|null} windowStart - Normalized start time in minutes
 * @property {number|null} windowEnd - Normalized end time in minutes
 * @property {string|null} windowStartFormatted - Formatted start time string
 * @property {string|null} windowEndFormatted - Formatted end time string
 */

/**
 * @typedef {Object} TimeWindowPickerProps
 * @property {string} label - Section label
 * @property {TimeWindowValue} value - Current value
 * @property {function} onChange - Called with updated TimeWindowValue
 * @property {Object} errors - Validation errors { date?: string, time?: string }
 * @property {string} minDate - Minimum selectable date (ISO string)
 * @property {boolean} disabled - Disable all inputs
 */