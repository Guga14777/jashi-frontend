// src/utils/constants.js

/** =========================================
 * App-wide constants & config
 * ========================================= */

// API / Env
export const APP_NAME = 'Mercury Transport';
export const APP_VERSION = '1.0.0';
export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, '') || 'https://api.example.com';
export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000);
export const USE_API_MOCKS = String(import.meta.env.VITE_USE_API_MOCKS || 'false') === 'true';

// Storage keys
export const STORAGE_KEYS = {
  authToken: 'mt_auth_token',
  refreshToken: 'mt_refresh_token',
  user: 'mt_user',
  theme: 'mt_theme',
};

// Routing helpers (adjust if your router paths differ)
export const ROUTES = {
  carrierDashboard: '/carrier',
  carrierLoads: '/carrier/loads',
  myLoads: '/carrier/my-loads',
  login: '/auth/carrier/login',
  signup: '/auth/carrier/signup',
  notFound: '/404',
};

// Domain enums
export const LOAD_STATUS = {
  SCHEDULED: 'scheduled',
  ASSIGNED: 'assigned',
  BOOKED: 'booked',
  PICKUP_SCHEDULED: 'pickup_scheduled',
  IN_TRANSIT: 'in_transit',
  PICKED_UP: 'picked_up',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

// ⭐ Tab to status mapping for carrier loads - ensures counts and filters stay aligned
export const TAB_STATUS_MAP = {
  all: null, // null means show all statuses
  scheduled: ['scheduled', 'assigned', 'booked', 'pickup_scheduled'],
  in_transit: ['in_transit', 'picked_up'],
  delivered: ['delivered'],
  cancelled: ['cancelled'],
};

// Helper function to check if a status belongs to a tab
export const statusBelongsToTab = (status, tab) => {
  if (tab === 'all' || !TAB_STATUS_MAP[tab]) return true;
  return TAB_STATUS_MAP[tab].includes(status);
};

export const TRANSPORT_TYPES = ['Open', 'Enclosed'];

// Vehicle types offered in quote + shipper flow. Order matters — this is the
// list surfaced in dropdowns. Keep grouped: road vehicles first, then
// specialty/recreational. VIN rules per type live in src/utils/vin-rules.js.
export const VEHICLE_TYPES = [
  'Sedan',
  'SUV',
  'Pickup Truck',
  'Coupe',
  'Hatchback',
  'Minivan',
  'Van',
  'Wagon',
  'Box Truck',
  'RV / Motorhome',
  'Motorcycle',
  'Scooter',
  'ATV',
  'Dirt Bike',
  'Golf Cart',
  'Snowmobile',
  'Trailer',
  'Boat',
  'Boat on Trailer',
];

// ============================================================
// ✅ SCHEDULING RULES - Location Types, Appointments, Authorization
// ============================================================

/**
 * Location types for pickup/dropoff facilities
 * Each type has different scheduling rules
 */
export const LOCATION_TYPES = {
  AUCTION: 'auction',
  DEALERSHIP: 'dealership',
  RESIDENTIAL: 'residential',
  TERMINAL: 'terminal',
  PORT: 'port',
  OTHER: 'other',
};

/**
 * Appointment requirement states
 * Determines if carrier must schedule appointment before pickup attempt
 */
export const APPOINTMENT_REQUIREMENT = {
  REQUIRED: 'required',         // Must schedule appointment (e.g., Copart)
  NOT_REQUIRED: 'not_required', // Can attempt without appointment (e.g., Manheim)
  UNKNOWN: 'unknown',           // Unknown facility - proceed with caution
};

/**
 * Attempt authorization states
 * Determines if carrier is authorized to attempt pickup/dropoff
 */
export const ATTEMPT_AUTH = {
  AUTHORIZED: 'authorized',                     // Fully authorized to attempt
  AUTHORIZED_PROTECTED: 'authorized_protected', // Authorized but with protection (unknown facility on weekday)
  NOT_AUTHORIZED: 'not_authorized',             // Not authorized - missing requirements
};

/**
 * Time preferences for scheduling
 */
export const TIME_PREFERENCE = {
  MORNING: 'morning',     // 8:00 AM - 12:00 PM
  AFTERNOON: 'afternoon', // 12:00 PM - 6:00 PM
  FLEXIBLE: 'flexible',   // Any time during business hours
};

/**
 * Known auction facilities with their appointment requirements
 * Used for auto-detection from facility name
 */
export const KNOWN_AUCTION_FACILITIES = {
  // Copart facilities - ALWAYS require appointment
  COPART: {
    keywords: ['copart'],
    appointmentRequirement: APPOINTMENT_REQUIREMENT.REQUIRED,
    weekendsAllowed: false,
    notes: 'Must schedule appointment via Copart system before pickup',
  },
  // IAA (Insurance Auto Auctions) - ALWAYS require appointment
  IAA: {
    keywords: ['iaa', 'insurance auto auction'],
    appointmentRequirement: APPOINTMENT_REQUIREMENT.REQUIRED,
    weekendsAllowed: false,
    notes: 'Must schedule appointment via IAA system before pickup',
  },
  // Manheim - Typically does NOT require appointment
  MANHEIM: {
    keywords: ['manheim'],
    appointmentRequirement: APPOINTMENT_REQUIREMENT.NOT_REQUIRED,
    weekendsAllowed: false,
    notes: 'Appointment typically not required, but recommended during peak times',
  },
  // ADESA - Typically does NOT require appointment
  ADESA: {
    keywords: ['adesa'],
    appointmentRequirement: APPOINTMENT_REQUIREMENT.NOT_REQUIRED,
    weekendsAllowed: false,
    notes: 'Appointment typically not required',
  },
};

/**
 * Default scheduling rules by location type
 */
export const LOCATION_TYPE_DEFAULTS = {
  [LOCATION_TYPES.AUCTION]: {
    weekendsAllowed: false,
    timeWindowRequired: false,
    appointmentRequirement: APPOINTMENT_REQUIREMENT.UNKNOWN,
    businessHoursOnly: true,
    gatePassRequired: true,
  },
  [LOCATION_TYPES.DEALERSHIP]: {
    weekendsAllowed: true, // Many dealerships open on Saturdays
    timeWindowRequired: false,
    appointmentRequirement: APPOINTMENT_REQUIREMENT.NOT_REQUIRED,
    businessHoursOnly: true,
    gatePassRequired: false,
  },
  [LOCATION_TYPES.RESIDENTIAL]: {
    weekendsAllowed: true,
    timeWindowRequired: true, // Residential requires time window for customer availability
    appointmentRequirement: APPOINTMENT_REQUIREMENT.NOT_REQUIRED,
    businessHoursOnly: false,
    gatePassRequired: false,
  },
  [LOCATION_TYPES.TERMINAL]: {
    weekendsAllowed: false,
    timeWindowRequired: false,
    appointmentRequirement: APPOINTMENT_REQUIREMENT.REQUIRED,
    businessHoursOnly: true,
    gatePassRequired: true,
  },
  [LOCATION_TYPES.PORT]: {
    weekendsAllowed: false,
    timeWindowRequired: false,
    appointmentRequirement: APPOINTMENT_REQUIREMENT.REQUIRED,
    businessHoursOnly: true,
    gatePassRequired: true,
  },
  [LOCATION_TYPES.OTHER]: {
    weekendsAllowed: true,
    timeWindowRequired: false,
    appointmentRequirement: APPOINTMENT_REQUIREMENT.UNKNOWN,
    businessHoursOnly: false,
    gatePassRequired: false,
  },
};

/**
 * Required documents by location type
 */
export const REQUIRED_DOCS_BY_LOCATION = {
  [LOCATION_TYPES.AUCTION]: ['gatePass', 'buyerNumber'],
  [LOCATION_TYPES.DEALERSHIP]: [],
  [LOCATION_TYPES.RESIDENTIAL]: [],
  [LOCATION_TYPES.TERMINAL]: ['gatePass'],
  [LOCATION_TYPES.PORT]: ['gatePass', 'portAuthorization'],
  [LOCATION_TYPES.OTHER]: [],
};

/**
 * Days of week constants
 */
export const DAYS_OF_WEEK = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

/**
 * Weekend days
 */
export const WEEKEND_DAYS = [DAYS_OF_WEEK.SATURDAY, DAYS_OF_WEEK.SUNDAY];

// UI defaults
export const UI = {
  pageSizeDefault: 10,
  gridPageSize: 12,
  listPageSize: 20,
};

// Date / formatting
export const DATE_FORMATS = {
  short: 'MMM d, yyyy',
  long: 'MMMM d, yyyy',
};

// Backend endpoints (joined with API_BASE_URL in request.js)
export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    refresh: '/auth/refresh',
    me: '/auth/me',
  },
  loads: {
    listAvailable: '/loads/available',
    listMyLoads: '/loads/my',
    getById: (id) => `/loads/${encodeURIComponent(id)}`,
    accept: (id) => `/loads/${encodeURIComponent(id)}/accept`,
  },
  payments: {
    list: '/payments',
    payout: (id) => `/payments/${encodeURIComponent(id)}`,
  },
};

// Feature flags (turn on/off UI pieces)
export const FEATURES = {
  enableAcceptOfferFlow: true,
  showPhotosBadge: true,
  stickyHeader: true,
};

// Reusable error messages
export const MESSAGES = {
  genericError: 'Something went wrong. Please try again.',
  networkError: 'Network error. Check your connection.',
  unauthorized: 'Your session has expired. Please log in again.',
};