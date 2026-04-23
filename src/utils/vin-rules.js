// src/utils/vin-rules.js
// VIN / serial-number validation rules, keyed by vehicle type.
// Backend mirror at server/services/booking/vin-rules.cjs — keep in sync.

// Valid VIN characters per ISO 3779: alphanumeric excluding I, O, Q.
const STANDARD_VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
const SERIAL_PATTERN = /^[A-Z0-9]{6,25}$/;

const STANDARD_RULE = Object.freeze({
  kind: 'standard',
  label: 'VIN',
  placeholder: '17-character VIN (e.g. 1HGBH41JXMN109186)',
  helperText: 'Required. Standard 17-character VIN. Letters and numbers only (no I, O, or Q).',
  minLength: 17,
  maxLength: 17,
  mustBe17: true,
  pattern: STANDARD_VIN_PATTERN,
});

const SERIAL_RULE = Object.freeze({
  kind: 'serial',
  label: 'VIN / Serial Number',
  placeholder: 'Serial or frame number',
  helperText: 'Required. Enter the VIN or serial/frame number printed on the vehicle (6–25 characters).',
  minLength: 6,
  maxLength: 25,
  mustBe17: false,
  pattern: SERIAL_PATTERN,
});

// Canonical mapping: vehicle type → rule kind.
// Standard: anything titled, DOT-registered for roads since ~1981.
// Serial:   off-road, recreational, and marine vehicles where a 17-char VIN
//           often doesn't exist or isn't standardized.
const VEHICLE_TYPE_TO_RULE_KIND = {
  // Standard passenger + commercial road vehicles
  'Sedan':          'standard',
  'SUV':            'standard',
  'Pickup Truck':   'standard',
  'Coupe':          'standard',
  'Hatchback':      'standard',
  'Minivan':        'standard',
  'Van':            'standard',
  'Wagon':          'standard',
  'Box Truck':      'standard',
  'RV / Motorhome': 'standard',
  'Motorcycle':     'standard',

  // Flexible serial / frame number
  'Scooter':         'serial',
  'ATV':             'serial',
  'Dirt Bike':       'serial',
  'Golf Cart':       'serial',
  'Snowmobile':      'serial',
  'Trailer':         'serial',
  'Boat':            'serial',
  'Boat on Trailer': 'serial',
};

const normalize = (v) => String(v || '').trim();

const ruleKindForType = (vehicleType) => {
  const key = normalize(vehicleType);
  // Try exact match first, then a lowercase fallback for legacy values.
  if (VEHICLE_TYPE_TO_RULE_KIND[key]) return VEHICLE_TYPE_TO_RULE_KIND[key];
  const lower = key.toLowerCase();
  const match = Object.keys(VEHICLE_TYPE_TO_RULE_KIND).find(
    (k) => k.toLowerCase() === lower
  );
  // Unknown types default to standard — safer to demand a full VIN than
  // let someone slide through with a 3-character placeholder.
  return match ? VEHICLE_TYPE_TO_RULE_KIND[match] : 'standard';
};

/**
 * Get the VIN rule object for a vehicle type.
 * Returns a frozen rule with { kind, label, placeholder, helperText,
 * minLength, maxLength, mustBe17, pattern }.
 */
export const getVinRules = (vehicleType) => {
  return ruleKindForType(vehicleType) === 'serial' ? SERIAL_RULE : STANDARD_RULE;
};

/**
 * Sanitize user input to uppercase alphanumeric, capped at rule.maxLength.
 * Strips characters that don't belong in any identifier.
 */
export const sanitizeVinInput = (raw, vehicleType) => {
  const rule = getVinRules(vehicleType);
  const cleaned = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return cleaned.slice(0, rule.maxLength);
};

/**
 * Validate a sanitized VIN/serial against its rule.
 * Returns { valid: boolean, error?: string }.
 */
export const validateVin = (value, vehicleType) => {
  const rule = getVinRules(vehicleType);
  const v = String(value || '').toUpperCase();

  if (!v) {
    return { valid: false, error: `${rule.label} is required.` };
  }

  if (v.length < rule.minLength) {
    return {
      valid: false,
      error: rule.mustBe17
        ? `VIN must be exactly 17 characters (got ${v.length}).`
        : `${rule.label} must be at least ${rule.minLength} characters.`,
    };
  }

  if (v.length > rule.maxLength) {
    return {
      valid: false,
      error: `${rule.label} cannot be longer than ${rule.maxLength} characters.`,
    };
  }

  if (!rule.pattern.test(v)) {
    return {
      valid: false,
      error: rule.mustBe17
        ? 'Invalid VIN. Use letters (except I, O, Q) and numbers only.'
        : `${rule.label} may contain letters and numbers only.`,
    };
  }

  return { valid: true };
};

export const VIN_RULE_KINDS = { STANDARD: 'standard', SERIAL: 'serial' };
