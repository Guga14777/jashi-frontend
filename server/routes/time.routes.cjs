// ============================================================
// FILE: server/routes/time.routes.cjs
// ✅ Provides server UTC time for client-side validation
// ✅ Prevents users from manipulating device clock to bypass 2-hour rule
// ============================================================

const express = require('express');
const router = express.Router();

/**
 * GET /api/time/now
 * Returns current server time in UTC
 * 
 * Used by TimeWindowPicker to calculate "now + 2 hours" rule
 * without relying on potentially-manipulated device clocks.
 * 
 * Response:
 * {
 *   "utc": "2026-01-19T19:15:00.000Z",
 *   "timestamp": 1768857300000
 * }
 */
router.get('/now', (req, res) => {
  const now = new Date();
  
  res.json({
    utc: now.toISOString(),
    timestamp: now.getTime(),
  });
});

module.exports = router;
