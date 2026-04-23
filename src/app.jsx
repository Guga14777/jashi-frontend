// ============================================================
// FILE: src/app.jsx - Updated with Admin Portal routes
// ✅ FIXED: Added NotificationDetailModal to CustomerLayout
// ============================================================

import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  Outlet,
} from "react-router-dom";
import ProtectedRoute from "./routes/protected-route.jsx";
import { useAuth } from "./store/auth-context.jsx";

/* Headers & Footers */
import PublicHeader from "./components/header/public/publicheader.jsx";
import CarrierHeader from "./components/header/carrier/carrierheader.jsx";
import CustomerHeader from "./components/header/customer/customerheader.jsx";
import Footer from "./components/footer/footer.jsx";
import CarrierDashboardFooter from "./components/footer/carrier-dashboard-footer.jsx";
import CustomerDashboardFooter from "./components/footer/customer-dashboard-footer.jsx";
import LiveChat from "./components/live-chat/live-chat.jsx";
import { NotificationPanel } from "./pages/notifications/notifications.jsx";
import { CustomerNotificationPanel } from "./pages/customer-notifications/notifications.customer.jsx";
// ✅ ADD THIS IMPORT
import NotificationDetailModal from "./pages/customer-notifications/notification-detail-modal.jsx";

/* Public pages */
import Home from "./pages/home/home.jsx";
import ForgotPassword from "./pages/auth/forgot-password.jsx";
import ResetPassword from "./pages/auth/reset-password.jsx";
import About from "./pages/about/about.jsx";
import HowDispatchWorks from "./pages/how-dispatch-works/how-dispatch-works.jsx";
import ShippingGuide from "./pages/shipping-guide/shipping-guide.jsx";
import Insurance from "./pages/insurance/insurance.jsx";
import ServiceAreas from "./pages/service-areas/service-areas.jsx";
import Privacy from "./pages/privacy/privacy.jsx";
import Terms from "./pages/terms/terms.jsx";
import CookiesPage from "./pages/cookies/cookies.jsx";
import Apps from "./pages/apps/apps.jsx";

/* Customer dashboard */
import CustomerDashboard from "./pages/customer-dashboard/customer-dashboard.jsx";
import CustomerProfile from "./pages/dashboard/profile/profile.jsx";
import CustomerDocuments from "./pages/dashboard/customer-documents/customer-documents.jsx";
import CustomerHelp from "./pages/dashboard/help/help.jsx";
import CustomerPayments from "./pages/dashboard/payments/payments.jsx";
import CustomerNotificationsPage from "./pages/customer-notifications/customer-notifications-page.jsx";

import * as ShipmentsModule from "./pages/dashboard/shipments/shipments.jsx";
const ShipmentsPage = () => {
  const C = ShipmentsModule.Shipments || ShipmentsModule.ShipmentsPage || ShipmentsModule.default;
  return C ? <C /> : null;
};

import * as LiveTrackingModule from "./pages/dashboard/track/live-tracking.jsx";
const LiveTrackingPage = () => {
  const C = LiveTrackingModule.LiveTracking || LiveTrackingModule.LiveTrackingPage || LiveTrackingModule.default;
  return C ? <C /> : null;
};

import * as QuotesModule from "./pages/dashboard/quotes/quotes.jsx";
const QuotesPage = () => {
  const C = QuotesModule.Quotes || QuotesModule.QuotesPage || QuotesModule.default;
  return C ? <C /> : null;
};

import CustomerPrivacyPolicy from "./pages/dashboard/policies/customer-privacy.jsx";
import CustomerTerms from "./pages/dashboard/policies/customer-terms.jsx";
import CustomerCookies from "./pages/dashboard/policies/customer-cookies.jsx";
import Settings from "./pages/settings/settings.jsx";
import Security from "./pages/security/security.jsx";

/* Carrier dashboard */
import CarrierDashboard from "./pages/carrier-dashboard/carrier-dashboard.jsx";
import CarrierLoads from "./pages/carrier/loads/carrier-loads.jsx";
import NotificationsPage from "./pages/notifications/notifications.jsx";
import Payments from "./pages/payments/payments.jsx";
import Documents from "./pages/documents/documents.jsx";
import Profile from "./pages/profile/profile.jsx";
import Analytics from "./pages/analytics/analytics.jsx";
import Help from "./pages/help/help.jsx";
import PostTruck from "./pages/carrier/post-truck.jsx";
import CarrierPayouts from "./pages/carrier/payouts.jsx";
import Compliance from "./pages/carrier/compliance.jsx";
import CarrierClaims from "./pages/carrier/claims.jsx";
import Factoring from "./pages/carrier/factoring.jsx";

import BrokerCarrierAgreement from "./pages/legal/broker-carrier-agreement.jsx";
import CarrierTerms from "./pages/legal/carrier-terms.jsx";
import SafetyInsurance from "./pages/legal/safety-insurance.jsx";
import CarrierPrivacy from "./pages/legal/carrier-privacy.jsx";
import CarrierCookiesLegal from "./pages/legal/carrier-cookies.jsx";
import DetentionTonu from "./pages/policy/detention-tonu.jsx";

/* Auth modal */
import Modal from "./components/ui/modal.jsx";
import GlobalAuthModal from "./components/auth/global-auth-modal.jsx";
import CustomerLoginForm from "./components/auth/customerloginform.jsx";
import CustomerSignupForm from "./components/auth/customersignupform.jsx";
import CarrierLoginForm from "./components/auth/carrierloginform.jsx";
import CarrierSignupForm from "./components/auth/carriersignupform.jsx";

/* Quote modal */
import CustomerQuoteModal from "./components/ui/customer-quote-modal.jsx";
import CustomerQuoteWidget from "./components/quote-widget/quote-widget.customer.jsx";

/* Shipper Portal */
import ShipperPortal from "./pages/shipper-portal/index.jsx";
import OfferReview from "./pages/shipper-portal/sections/offer-review.jsx";
import PickupDetails from "./pages/shipper-portal/sections/pickup-details.jsx";
import DropoffDetails from "./pages/shipper-portal/sections/dropoff-details.jsx";
import VehicleDetails from "./pages/shipper-portal/sections/vehicle-details.jsx";
import Confirm from "./pages/shipper-portal/sections/confirm.jsx";
import Payment from "./pages/shipper-portal/sections/payment.jsx";

/* Admin Pages */
import AdminHeader from "./pages/admin/adminheader.jsx";
import OrdersAdmin from "./pages/admin/orders-admin.jsx";
import DocumentsAdmin from "./pages/admin/documents-admin.jsx";
import CustomersAdmin from "./pages/admin/customers-admin.jsx";
import CarriersAdmin from "./pages/admin/carriers-admin.jsx";
import AnalyticsAdmin from "./pages/admin/analytics-admin.jsx";
import ActivityAdmin from "./pages/admin/activity-admin.jsx";
import SettingsAdmin from "./pages/admin/settings-admin.jsx";
import AdminLogin from "./pages/admin/admin-login.jsx";

/* Styles */
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/app.css";
import "./styles/utilities.css";
import "./styles/mobile-responsive.css";
import "./components/ui/ui-components.css";
import "./components/auth/customer-login.css";

// ScrollToTop — force scroll to the true top on every route change. Runs on
// initial mount too (so a cold page load can't land mid-hero because browser
// scroll-restoration applied late). It does NOT scroll when only the query
// string changes (e.g. ?auth=shipper-login toggling): that would yank the
// page around as the user clicks Log In. Scroll restoration is disabled at
// boot in main.jsx so refresh/back-forward no longer jumps mid-page.
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const forceTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    // Run now, on next frame, and shortly after — the second and third calls
    // defeat any late layout growth (fonts, images) that might otherwise pull
    // the viewport down if something anchored scroll to the old position.
    forceTop();
    requestAnimationFrame(forceTop);
    const t = setTimeout(forceTop, 80);
    return () => clearTimeout(t);
  }, [pathname]);

  return null;
}

function useSuppressLayoutFooter(patterns) {
  const { pathname } = useLocation();
  return patterns.some((p) =>
    pathname.toLowerCase().startsWith(p.toLowerCase())
  );
}

function CarrierLayout() {
  const { pathname } = useLocation();
  const suppressPrefixes = [
    "/analytics", "/documents", "/profile", "/help", "/carrier/loads",
    "/carrier/loads/", "/carrier/payouts", "/carrier/compliance",
    "/carrier/claims", "/carrier/factoring", "/legal", "/policy",
    "/settings", "/notifications/full",
  ];
  const whitelist = ["/legal/carrier-privacy", "/legal/carrier-cookies"];
  const startsWithAny = (ps) => ps.some((p) => pathname.toLowerCase().startsWith(p.toLowerCase()));
  const suppressFooter = startsWithAny(suppressPrefixes) && !startsWithAny(whitelist);

  return (
    <>
      <CarrierHeader />
      <NotificationPanel />
      <Outlet />
      {!suppressFooter && <CarrierDashboardFooter />}
      <LiveChat />
    </>
  );
}

// ✅ FIXED: Added NotificationDetailModal to CustomerLayout
function CustomerLayout() {
  const location = useLocation();
  const suppressFooterPrefixes = ["/dashboard/profile", "/dashboard/settings", "/dashboard/help"];
  const suppressFooter = useSuppressLayoutFooter(suppressFooterPrefixes);
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const openQuote = () => setIsQuoteOpen(true);
  const closeQuote = () => setIsQuoteOpen(false);

  useEffect(() => {
    const selectors = ['[data-cta="request-shipment"]', ".floating-request-cta", "#request-shipment-fab"];
    selectors.forEach((sel) =>
      document.querySelectorAll(sel).forEach((n) => { n.style.display = "none"; })
    );
  }, [location.pathname]);

  return (
    <>
      <CustomerHeader />
      <CustomerNotificationPanel />
      {/* ✅ FIXED: Modal renders at layout level - reads selectedNotification from context */}
      <NotificationDetailModal />
      <Outlet />
      <CustomerQuoteModal open={isQuoteOpen} onClose={closeQuote} closeOnBackdrop className="customer-quote-modal-wrapper">
        <CustomerQuoteWidget onModalClose={closeQuote} inModal />
      </CustomerQuoteModal>
      {!suppressFooter && <CustomerDashboardFooter onRequestShipmentClick={openQuote} />}
      <LiveChat />
    </>
  );
}

// ShipperPortalLayout with its own scroll reset on every step change
function ShipperPortalLayout() {
  const { pathname } = useLocation();

  // Scroll to top whenever route changes within shipper portal
  useEffect(() => {
    // Immediate scroll attempts
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Use requestAnimationFrame for after render
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });

    // Additional delayed attempt for any async content
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 50);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <>
      <CustomerHeader />
      <ShipperPortal />
      <LiveChat />
      <Footer />
    </>
  );
}

// Admin Layout - Simple with just AdminHeader
function AdminLayout() {
  return (
    <>
      <AdminHeader />
      <Outlet />
    </>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <GlobalAuthModal />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/apps" element={<Apps />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/about" element={<About />} />
        <Route path="/how-dispatch-works" element={<HowDispatchWorks />} />
        <Route path="/shipping-guide" element={<ShippingGuide />} />
        <Route path="/insurance" element={<Insurance />} />
        <Route path="/service-areas" element={<ServiceAreas />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/cookies" element={<CookiesPage />} />

        {/* ===== ADMIN ROUTES ===== */}
        {/* Public — dedicated admin login. Must come BEFORE the /admin/*
            catch-all so that an unauthenticated visitor to /admin/login
            doesn't get redirected back to itself in a loop. */}
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allow={["ADMIN"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<OrdersAdmin />} />
          <Route path="orders" element={<OrdersAdmin />} />
          <Route path="documents" element={<DocumentsAdmin />} />
          <Route path="customers" element={<CustomersAdmin />} />
          <Route path="carriers" element={<CarriersAdmin />} />
          <Route path="analytics" element={<AnalyticsAdmin />} />
          <Route path="activity" element={<ActivityAdmin />} />
          <Route path="settings" element={<SettingsAdmin />} />
        </Route>

        {/* Shipper Portal */}
        <Route
          path="/shipper"
          element={
            <ProtectedRoute allow={["customer"]}>
              <ShipperPortalLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<OfferReview />} />
          <Route path="offer" element={<OfferReview />} />
          <Route path="pickup" element={<PickupDetails />} />
          <Route path="dropoff" element={<DropoffDetails />} />
          <Route path="vehicle" element={<VehicleDetails />} />
          <Route path="confirm" element={<Confirm />} />
          <Route path="payment" element={<Payment />} />
        </Route>

        {/* Customer Dashboard */}
        <Route path="/dashboard" element={<ProtectedRoute allow={["customer"]}><CustomerLayout /></ProtectedRoute>}>
          <Route index element={<CustomerDashboard />} />
          <Route path="profile" element={<CustomerProfile />} />
          <Route path="documents" element={<CustomerDocuments />} />
          <Route path="payments" element={<CustomerPayments />} />
          <Route path="settings" element={<Settings />} />
          <Route path="help" element={<CustomerHelp />} />
          <Route path="security" element={<Security />} />
          <Route path="shipments" element={<ShipmentsPage />} />
          <Route path="quotes" element={<QuotesPage />} />
          <Route path="track" element={<LiveTrackingPage />} />
          <Route path="policies/privacy" element={<CustomerPrivacyPolicy />} />
          <Route path="policies/terms" element={<CustomerTerms />} />
          <Route path="policies/cookies" element={<CustomerCookies />} />
          <Route path="policies/insurance" element={<Insurance />} />
        </Route>

        {/* Customer notifications */}
        <Route path="/customer-notifications" element={<ProtectedRoute allow={["customer"]}><CustomerLayout /></ProtectedRoute>}>
          <Route index element={<CustomerNotificationsPage />} />
        </Route>

        {/* Carrier Dashboard */}
        <Route element={<ProtectedRoute allow={["carrier"]}><CarrierLayout /></ProtectedRoute>}>
          <Route path="/carrier-dashboard" element={<CarrierDashboard />} />
          <Route path="/carrier" element={<Navigate to="/carrier-dashboard" replace />} />
          <Route path="/carrier/loads" element={<CarrierLoads />} />
          <Route path="/carrier/loads/:loadId" element={<CarrierLoads />} />
          <Route path="/carrier/post-truck" element={<PostTruck />} />
          <Route path="/carrier/payouts" element={<CarrierPayouts />} />
          <Route path="/carrier/compliance" element={<Compliance />} />
          <Route path="/carrier/claims" element={<CarrierClaims />} />
          <Route path="/carrier/factoring" element={<Factoring />} />
          <Route path="/carrier/apps" element={<Apps />} />
          <Route path="/notifications/full" element={<NotificationsPage />} />
          <Route path="/settings/notifications" element={<Settings />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/payments/:paymentId" element={<Payments />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/help" element={<Help />} />
          <Route path="/security" element={<Security />} />
          <Route path="/legal/broker-carrier-agreement" element={<BrokerCarrierAgreement />} />
          <Route path="/legal/carrier-terms" element={<CarrierTerms />} />
          <Route path="/legal/carrier-privacy" element={<CarrierPrivacy />} />
          <Route path="/legal/carrier-cookies" element={<CarrierCookiesLegal />} />
          <Route path="/legal/safety-insurance" element={<SafetyInsurance />} />
          <Route path="/policy/detention-tonu" element={<DetentionTonu />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}