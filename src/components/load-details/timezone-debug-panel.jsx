// ============================================================
// FILE: src/components/load-details/TimezoneDebugPanel.jsx
// TEMPORARY DEBUG COMPONENT - Remove after testing
// Shows all timezone conversion values to verify correctness
// ============================================================

import React, { useMemo, useState, useEffect } from 'react';
import { getTimezoneForState, getTimezoneAbbreviation } from '../../utils/timezone-utils.js';

/**
 * Parse time string (e.g., "10:00 AM") to hours/minutes
 */
const parseTimeString = (timeStr) => {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  return { hours, minutes };
};

/**
 * REFERENCE IMPLEMENTATION: Convert local datetime to UTC
 * This is the "expected" converter for comparison
 */
const referenceLocalDateTimeToUTC = (dateStr, timeStr, timezone) => {
  if (!dateStr) return null;
  
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return null;
  
  let targetHours = 0;
  let targetMinutes = 0;
  
  if (timeStr) {
    const time = parseTimeString(timeStr);
    if (time) {
      targetHours = time.hours;
      targetMinutes = time.minutes;
    }
  }
  
  if (!timezone) {
    return new Date(year, month - 1, day, targetHours, targetMinutes, 0, 0).getTime();
  }
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  let guessUTC = Date.UTC(year, month - 1, day, targetHours, targetMinutes, 0, 0);
  
  for (let iteration = 0; iteration < 5; iteration++) {
    const parts = formatter.formatToParts(new Date(guessUTC));
    
    const guessYear = parseInt(parts.find(p => p.type === 'year')?.value || '0', 10);
    const guessMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0', 10);
    const guessDay = parseInt(parts.find(p => p.type === 'day')?.value || '0', 10);
    const guessHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const guessMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    
    const targetTotal = new Date(year, month - 1, day, targetHours, targetMinutes).getTime();
    const guessTotal = new Date(guessYear, guessMonth - 1, guessDay, guessHour, guessMinute).getTime();
    const diffMs = targetTotal - guessTotal;
    const diffMinutes = Math.round(diffMs / (60 * 1000));
    
    if (Math.abs(diffMinutes) < 1) break;
    guessUTC += diffMinutes * 60 * 1000;
  }
  
  return guessUTC;
};

const TimezoneDebugPanel = ({ 
  scheduledDate, 
  pickupWindowStart, 
  pickupState,
  // Optional: pass your actual converter to compare against reference
  actualLocalDateTimeToUTC = null,
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  // Update every second to show live countdown
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const debug = useMemo(() => {
    // === BROWSER INFO ===
    const browserTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const browserNowLocal = new Date(currentTime).toString();
    const nowUTC = currentTime;
    const nowUTC_ISO = new Date(nowUTC).toISOString();
    
    // === PICKUP TIMEZONE ===
    const pickupTZ = pickupState ? getTimezoneForState(pickupState) : null;
    const tzAbbr = pickupTZ ? getTimezoneAbbreviation(pickupTZ) : 'N/A';
    
    // === CURRENT TIME IN PICKUP TZ ===
    const pickupNowInTZ = pickupTZ 
      ? new Date(currentTime).toLocaleString('en-US', { 
          timeZone: pickupTZ, 
          hour: 'numeric', 
          minute: '2-digit',
          second: '2-digit',
          hour12: true 
        })
      : 'N/A (no TZ)';
    
    // === WINDOW START ===
    const windowStartInTZ = scheduledDate && pickupWindowStart 
      ? `${scheduledDate} ${pickupWindowStart} ${tzAbbr}`
      : 'N/A';
    
    // Reference implementation result
    const windowStartUTC_ref = referenceLocalDateTimeToUTC(scheduledDate, pickupWindowStart, pickupTZ);
    const windowStartUTC_ref_ISO = windowStartUTC_ref ? new Date(windowStartUTC_ref).toISOString() : 'N/A';
    
    // Actual implementation result (if provided)
    const windowStartUTC_actual = actualLocalDateTimeToUTC 
      ? actualLocalDateTimeToUTC(scheduledDate, pickupWindowStart, pickupTZ)
      : null;
    const windowStartUTC_actual_ISO = windowStartUTC_actual ? new Date(windowStartUTC_actual).toISOString() : 'N/A';
    
    // === AVAILABLE AT (WINDOW - 2H BUFFER) ===
    const availableAtUTC_ref = windowStartUTC_ref ? windowStartUTC_ref - (2 * 60 * 60 * 1000) : null;
    const availableAtUTC_ref_ISO = availableAtUTC_ref ? new Date(availableAtUTC_ref).toISOString() : 'N/A';
    
    const availableAtInTZ = availableAtUTC_ref && pickupTZ
      ? new Date(availableAtUTC_ref).toLocaleString('en-US', {
          timeZone: pickupTZ,
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      : 'N/A';
    
    // === DIFF CALCULATION ===
    const diffMs = availableAtUTC_ref ? availableAtUTC_ref - nowUTC : null;
    const diffMinutes = diffMs !== null ? Math.round(diffMs / 60000) : null;
    const absDiffMinutes = diffMinutes !== null ? Math.abs(diffMinutes) : null;
    const diffHours = absDiffMinutes !== null ? Math.floor(absDiffMinutes / 60) : null;
    const diffMins = absDiffMinutes !== null ? absDiffMinutes % 60 : null;
    const isPast = diffMs !== null && diffMs < 0;
    
    // === EXPECTED VALUES (for Jan 23 10AM CA scenario) ===
    const expectedWindowStartUTC = '2026-01-23T18:00:00.000Z';
    const expectedAvailableAtUTC = '2026-01-23T16:00:00.000Z';
    
    // Check if we're testing the expected scenario
    const isExpectedScenario = scheduledDate === '2026-01-23' && 
                               pickupWindowStart === '10:00 AM' && 
                               pickupState === 'CA';
    
    const windowStartMatch = isExpectedScenario && windowStartUTC_ref_ISO === expectedWindowStartUTC;
    const availableAtMatch = isExpectedScenario && availableAtUTC_ref_ISO === expectedAvailableAtUTC;
    const actualMatchesRef = windowStartUTC_actual_ISO === windowStartUTC_ref_ISO;
    
    return {
      // Browser
      browserTZ,
      browserNowLocal,
      nowUTC_ISO,
      
      // Pickup
      pickupTZ: pickupTZ || '⚠️ NULL (using browser!)',
      pickupNowInTZ,
      
      // Window
      windowStartInTZ,
      windowStartUTC_ref_ISO,
      windowStartUTC_actual_ISO,
      windowStartMatch,
      actualMatchesRef,
      
      // Available at
      availableAtInTZ,
      availableAtUTC_ref_ISO,
      availableAtMatch,
      
      // Diff
      diffMs,
      diffMinutes,
      countdown: diffHours !== null 
        ? `${isPast ? '-' : ''}${diffHours}h ${diffMins}m` 
        : 'N/A',
      isPast,
      
      // Meta
      isExpectedScenario,
    };
  }, [scheduledDate, pickupWindowStart, pickupState, currentTime, actualLocalDateTimeToUTC]);

  // === STYLES ===
  const panelStyle = {
    position: 'fixed',
    bottom: '10px',
    right: '10px',
    width: '420px',
    maxHeight: '600px',
    overflow: 'auto',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    color: '#eee',
    padding: '16px',
    borderRadius: '12px',
    fontSize: '11px',
    fontFamily: 'Monaco, Consolas, monospace',
    zIndex: 99999,
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    border: '1px solid #333',
  };

  const headerStyle = {
    fontWeight: 'bold',
    marginBottom: '12px',
    color: '#ff9800',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const sectionStyle = {
    marginBottom: '12px',
    padding: '10px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
  };

  const sectionTitleStyle = {
    color: '#888',
    marginBottom: '8px',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  };

  const rowStyle = (status = null) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 8px',
    marginBottom: '4px',
    borderRadius: '4px',
    background: status === 'pass' ? 'rgba(76, 175, 80, 0.2)' 
              : status === 'fail' ? 'rgba(244, 67, 54, 0.2)' 
              : status === 'warn' ? 'rgba(255, 152, 0, 0.2)'
              : 'transparent',
  });

  const labelStyle = { 
    color: '#aaa', 
    fontSize: '10px',
    minWidth: '120px',
  };

  const valueStyle = { 
    color: '#4fc3f7', 
    textAlign: 'right', 
    wordBreak: 'break-all',
    fontSize: '11px',
    fontWeight: '500',
  };

  const getStatus = (match, isRelevant = true) => {
    if (!isRelevant) return null;
    return match ? 'pass' : 'fail';
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span>🔧</span>
        <span>TIMEZONE DEBUG PANEL</span>
        <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#666' }}>
          {new Date(currentTime).toLocaleTimeString()}
        </span>
      </div>
      
      {/* INPUT SECTION */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>📥 Input</div>
        <div style={rowStyle()}>
          <span style={labelStyle}>scheduledDate</span>
          <span style={valueStyle}>{scheduledDate || '(empty)'}</span>
        </div>
        <div style={rowStyle()}>
          <span style={labelStyle}>pickupWindowStart</span>
          <span style={valueStyle}>{pickupWindowStart || '(empty)'}</span>
        </div>
        <div style={rowStyle(pickupState ? null : 'fail')}>
          <span style={labelStyle}>pickupState</span>
          <span style={{...valueStyle, color: pickupState ? '#4fc3f7' : '#f44336'}}>
            {pickupState || '⚠️ MISSING!'}
          </span>
        </div>
      </div>

      {/* BROWSER SECTION */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>🌐 Browser (Your Location)</div>
        <div style={rowStyle()}>
          <span style={labelStyle}>browserTZ</span>
          <span style={valueStyle}>{debug.browserTZ}</span>
        </div>
        <div style={rowStyle()}>
          <span style={labelStyle}>browserNowLocal</span>
          <span style={{...valueStyle, fontSize: '9px'}}>{debug.browserNowLocal}</span>
        </div>
        <div style={rowStyle()}>
          <span style={labelStyle}>nowUTC (ISO)</span>
          <span style={valueStyle}>{debug.nowUTC_ISO}</span>
        </div>
      </div>

      {/* PICKUP SECTION */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>📍 Pickup Location</div>
        <div style={rowStyle(debug.pickupTZ.includes('NULL') ? 'fail' : null)}>
          <span style={labelStyle}>pickupTZ</span>
          <span style={{...valueStyle, color: debug.pickupTZ.includes('NULL') ? '#f44336' : '#4fc3f7'}}>
            {debug.pickupTZ}
          </span>
        </div>
        <div style={rowStyle()}>
          <span style={labelStyle}>pickupNowInTZ</span>
          <span style={valueStyle}>{debug.pickupNowInTZ}</span>
        </div>
      </div>

      {/* CONVERSION SECTION */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>🔄 Timezone Conversion</div>
        <div style={rowStyle()}>
          <span style={labelStyle}>windowStartInTZ</span>
          <span style={valueStyle}>{debug.windowStartInTZ}</span>
        </div>
        <div style={rowStyle(getStatus(debug.windowStartMatch, debug.isExpectedScenario))}>
          <span style={labelStyle}>
            windowStartUTC
            {debug.isExpectedScenario && (debug.windowStartMatch ? ' ✅' : ' ❌')}
          </span>
          <span style={valueStyle}>{debug.windowStartUTC_ref_ISO}</span>
        </div>
        {debug.windowStartUTC_actual_ISO !== 'N/A' && (
          <div style={rowStyle(debug.actualMatchesRef ? null : 'fail')}>
            <span style={labelStyle}>
              (actual impl)
              {debug.actualMatchesRef ? ' ✅' : ' ❌'}
            </span>
            <span style={{...valueStyle, color: debug.actualMatchesRef ? '#4fc3f7' : '#f44336'}}>
              {debug.windowStartUTC_actual_ISO}
            </span>
          </div>
        )}
        <div style={rowStyle()}>
          <span style={labelStyle}>availableAtInTZ</span>
          <span style={valueStyle}>{debug.availableAtInTZ}</span>
        </div>
        <div style={rowStyle(getStatus(debug.availableAtMatch, debug.isExpectedScenario))}>
          <span style={labelStyle}>
            availableAtUTC
            {debug.isExpectedScenario && (debug.availableAtMatch ? ' ✅' : ' ❌')}
          </span>
          <span style={valueStyle}>{debug.availableAtUTC_ref_ISO}</span>
        </div>
      </div>

      {/* RESULT SECTION */}
      <div style={{
        ...sectionStyle, 
        background: debug.isPast 
          ? 'rgba(244, 67, 54, 0.2)' 
          : 'rgba(76, 175, 80, 0.1)',
        border: `1px solid ${debug.isPast ? '#f44336' : '#4caf50'}`,
      }}>
        <div style={sectionTitleStyle}>⏱️ Result</div>
        <div style={rowStyle()}>
          <span style={labelStyle}>diffMs</span>
          <span style={valueStyle}>{debug.diffMs?.toLocaleString() ?? 'N/A'}</span>
        </div>
        <div style={rowStyle()}>
          <span style={labelStyle}>diffMinutes</span>
          <span style={valueStyle}>{debug.diffMinutes ?? 'N/A'}</span>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '8px',
          marginTop: '8px',
        }}>
          <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '12px' }}>
            COUNTDOWN
          </span>
          <span style={{ 
            color: debug.isPast ? '#f44336' : '#4caf50', 
            fontWeight: 'bold', 
            fontSize: '18px',
          }}>
            {debug.countdown}
          </span>
        </div>
      </div>

      {/* EXPECTED VALUES */}
      {debug.isExpectedScenario && (
        <div style={{ 
          padding: '10px', 
          background: 'rgba(33, 150, 243, 0.1)', 
          borderRadius: '8px',
          fontSize: '10px',
          color: '#64b5f6',
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>
            📋 Expected (Jan 23 10AM CA scenario):
          </div>
          <div>windowStartUTC: 2026-01-23T18:00:00.000Z</div>
          <div>availableAtUTC: 2026-01-23T16:00:00.000Z</div>
          <div>countdown: ~16h 23m (if now is 6:37 PM NYC)</div>
        </div>
      )}
    </div>
  );
};

export default TimezoneDebugPanel;