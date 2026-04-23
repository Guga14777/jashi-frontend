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