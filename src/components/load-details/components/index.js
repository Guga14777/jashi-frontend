// ============================================================
// FILE: src/components/load-details/components/index.js
// Consolidated exports for load-details components
// ============================================================

// Attempt Authorization Badge
export { default as AttemptAuthorizedBadge } from './attempt-authorized-badge';
export { 
  AuthorizationStatusInline, 
  AuthorizationText 
} from './attempt-authorized-badge';

// Status banners from alerts-strip
export { 
  CancelledNotice, 
  OnTheWayBanner, 
  ArrivedBanner, 
  DeliveredBanner 
} from './alerts-strip';

// Route, vehicle, schedule, locations from route-vehicle-card (named exports)
export {
  RouteVehicleCard,
  ScheduleCard,
  LocationsCard,
  RouteSummaryCard,
  MultiVehicleSection,
  NotesCard,
  VehicleCard,
  TimePill,
  LocationTypeBadge,
  DocLink,
} from './route-vehicle-card';

// Documents, photos, BOL from documents-panel (named exports)
export {
  BolButton,
  GatePassSection,
  PhotosDocumentsSection,
  ImageLightbox,
} from './documents-panel';

// Core modal components
export { default as StatusStepper } from './status-stepper';
export { default as ModalHeader } from './modal-header';
export { default as ModalFooter } from './modal-footer';

// Info cards
export { default as CustomerCard, CarrierCard } from './customer-card';
export { default as PayoutLikelihoodCard } from './payout-likelihood-card';

// Cancel modal
export { default as CancelConfirmModal } from './cancel-modal';

// Icons
export * from './icons';