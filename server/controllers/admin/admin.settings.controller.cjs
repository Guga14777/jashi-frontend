// server/controllers/admin/admin.settings.controller.cjs
//
// Admin-editable platform settings. Keeps a well-known schema of keys +
// their defaults + descriptions. Reads are open to any admin (for display);
// writes require ADMIN_SUPER and are audited.

const prisma = require('../../db.cjs');
const { DEFAULTS: ALERT_DEFAULTS } = require('../../services/admin/admin.alerts.service.cjs');

const SETTINGS_SCHEMA = {
  detentionThresholdMinutes: {
    type: 'number',
    default: 60,
    min: 5, max: 600,
    description: 'Minutes after "Arrived at Pickup" before detention fee eligibility starts.',
  },
  detentionFeeAmount: {
    type: 'number',
    default: 50,
    min: 0, max: 500,
    description: 'Default detention fee in USD.',
  },
  tonuFeeAmount: {
    type: 'number',
    default: 75,
    min: 0, max: 500,
    description: 'Truck Order Not Used fee in USD (paid to carrier on CNP approval).',
  },
  platformFeePercent: {
    type: 'number',
    default: 10,
    min: 0, max: 50,
    description: 'Platform fee % applied to booking price.',
  },
  alertUnassignedAfterMinutes: {
    type: 'number',
    default: ALERT_DEFAULTS.unassignedAfterMinutes,
    min: 5, max: 1440,
    description: 'Flag scheduled orders with no carrier after this many minutes.',
  },
  alertStuckAssignedAfterHours: {
    type: 'number',
    default: ALERT_DEFAULTS.stuckAssignedAfterHours,
    min: 1, max: 168,
    description: 'Flag orders stuck in "assigned" (no trip start) after this many hours.',
  },
  alertDelayedDeliveryAfterHours: {
    type: 'number',
    default: ALERT_DEFAULTS.delayedDeliveryAfterHours,
    min: 1, max: 720,
    description: 'Flag picked-up orders still in transit after this many hours.',
  },
  alertPriceFloorPerMile: {
    type: 'number',
    default: ALERT_DEFAULTS.priceFloorPerMile,
    min: 0, max: 10,
    description: 'Flag orders priced below this $/mi rate (possible mispricing).',
  },
  alertPriceCeilingPerMile: {
    type: 'number',
    default: ALERT_DEFAULTS.priceCeilingPerMile,
    min: 0, max: 50,
    description: 'Flag orders priced above this $/mi rate (possible mispricing).',
  },
};

function withSchemaMetadata(rows) {
  // Merge DB rows with the schema so admins see defaults for unset keys.
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return Object.entries(SETTINGS_SCHEMA).map(([key, meta]) => {
    const row = byKey.get(key);
    return {
      key,
      value: row ? row.value : meta.default,
      isDefault: !row,
      type: meta.type,
      default: meta.default,
      min: meta.min,
      max: meta.max,
      description: meta.description,
      updatedBy: row?.updatedBy || null,
      updatedAt: row?.updatedAt || null,
    };
  });
}

// GET /api/admin/settings
exports.listSettings = async (_req, res) => {
  try {
    const rows = await prisma.setting.findMany();
    res.json({ settings: withSchemaMetadata(rows) });
  } catch (err) {
    console.error('[admin-settings] list error:', err);
    res.status(500).json({ error: 'Failed to load settings' });
  }
};

// PUT /api/admin/settings/:key  { value: any }
// Only ADMIN_SUPER — enforced at route level via requireAdminTier('super').
exports.updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const meta = SETTINGS_SCHEMA[key];
    if (!meta) return res.status(400).json({ error: 'Unknown setting key', key });

    let { value } = req.body || {};

    // Light typing/coercion per schema.
    if (meta.type === 'number') {
      value = Number(value);
      if (!Number.isFinite(value)) return res.status(400).json({ error: 'Value must be a number' });
      if (typeof meta.min === 'number' && value < meta.min) return res.status(400).json({ error: `Value must be >= ${meta.min}` });
      if (typeof meta.max === 'number' && value > meta.max) return res.status(400).json({ error: `Value must be <= ${meta.max}` });
    } else if (meta.type === 'string') {
      value = String(value || '');
    } else if (meta.type === 'boolean') {
      value = Boolean(value);
    }

    // Capture before value for audit.
    const existing = await prisma.setting.findUnique({ where: { key } });
    const before = existing ? existing.value : meta.default;

    const row = await prisma.setting.upsert({
      where: { key },
      create: { key, value, description: meta.description, updatedBy: req.userId },
      update: { value, description: meta.description, updatedBy: req.userId },
    });

    await prisma.accountEvent.create({
      data: {
        userId: req.userId,
        eventType: 'admin_setting_changed',
        eventData: { key, before, after: value },
      },
    }).catch(() => {});

    res.json({
      success: true,
      setting: {
        key: row.key,
        value: row.value,
        type: meta.type,
        description: meta.description,
        updatedBy: row.updatedBy,
        updatedAt: row.updatedAt,
      },
    });
  } catch (err) {
    console.error('[admin-settings] update error:', err);
    res.status(500).json({ error: 'Failed to update setting' });
  }
};

module.exports.SETTINGS_SCHEMA = SETTINGS_SCHEMA;
module.exports.withSchemaMetadata = withSchemaMetadata;
