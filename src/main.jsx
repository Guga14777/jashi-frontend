// ============================================================
// FILE: src/main.jsx
// FIXED: No render blocking - instant app mount
// ============================================================

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app.jsx";
import { AuthProvider } from "./store/auth-context.jsx";
import { NotificationsProvider } from "./store/notifications-context.jsx";
import { CustomerNotificationsProvider } from "./store/customer-notifications-context.jsx";

// Disable the browser's scroll-restoration on refresh / back-forward. When this
// is left on "auto", Chrome restores the previous scrollY AFTER React mounts
// and AFTER layout settles, which lands the homepage mid-hero so the fixed
// header crops the headline. ScrollToTop in app.jsx handles intra-app
// navigation; this line owns the initial-load case.
if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}
// Belt-and-suspenders: if anything restored scroll before this line ran, wipe it.
if (typeof window !== "undefined") {
  window.scrollTo(0, 0);
}

// ⭐ CRITICAL: Create root immediately without any conditional logic
const root = ReactDOM.createRoot(document.getElementById("root"));

// ⭐ CRITICAL: Render immediately - providers never block
root.render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <NotificationsProvider>
          <CustomerNotificationsProvider>
            <App />
          </CustomerNotificationsProvider>
        </NotificationsProvider>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);