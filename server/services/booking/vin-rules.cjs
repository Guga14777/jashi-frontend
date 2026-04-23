// server/services/booking/vin-rules.cjs
// Backend mirror of src/utils/vin-rules.js. Same rule kinds, same vehicle-type
// mapping. Used to validate VIN / serial at the booking API boundary.

const STANDARD_VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
const SERIAL_PATTERN = /^[A-Z0-9]{6,25}$/;

const VEHICLE_TYPE_TO_RULE_KIND = {
  'Sedan': 'standard',
  'SUV': 'standard',
  'Pickup Truck': 'standard',
  'Coupe': 'standard',
  'Hatchback': 'standard',
  'Minivan': 'standard',
  'Van': 'standard',
  'Wagon': 'standard',
  'Box Truck': 'standard',
  'RV / Motorhome': 'standard',
  'Motorcycle': 'standard',
  'Scooter': 'serial',
  'ATV': 'serial',
  'Dirt Bike': 'serial',
  'Golf Cart': 'serial',
  'Snowmobile': 'serial',
  'Trailer': 'serial',
  'Boat': 'serial',
  'Boat on Trailer': 'serial',
};

const ruleKindForType = (vehicleType) => {
  const key = String(vehicleType || '').trim();
  if (VEHICLE_TYPE_TO_RULE_KIND[key]) return VEHICLE_TYPE_TO_RULE_KIND[key];
  const lower = key.toLowerCase();
  const match = Object.keys(VEHICLE_TYPE_TO_RULE_KIND).find((k) => k.toLowerCase() === lower);
  return match ? VEHICLE_TYPE_TO_RULE_KIND[match] : 'standard';
};

const getVinRules = (vehicleType) => {
  const kind = ruleKindForType(vehicleType);
  if (kind === 'serial') {
    return {
      kind,
      minLength: 6,
      maxLength: 25,
      pattern: SERIAL_PATTERN,
      label: 'VIN / Serial Number',
    };
  }
  return {
    kind,
    minLength: 17,
    maxLength: 17,
    pattern: STANDARD_VIN_PATTERN,
    label: 'VIN',
  };
};

const validateVin = (value, vehicleType) => {
  const rule = getVinRules(vehicleType);
  const v = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (!v) return { valid: false, error: `${rule.label} is required.` };
  if (v.length < rule.minLength) {
    return {
      valid: false,
      error: rule.kind === 'standard'
        ? `VIN must be exactly 17 characters (got ${v.length}).`
        : `${rule.label} must be at least ${rule.minLength} characters.`,
    };
  }
  if (v.length > rule.maxLength) {
    return { valid: false, error: `${rule.label} cannot be longer than ${rule.maxLength} characters.` };
  }
  if (!rule.pattern.test(v)) {
    return {
      valid: false,
      error: rule.kind === 'standard'
        ? 'Invalid VIN. Use letters (except I, O, Q) and numbers only.'
        : `${rule.label} may contain letters and numbers only.`,
    };
  }
  return { valid: true };
};

module.exports = {
  getVinRules,
  validateVin,
  ruleKindForType,
};
