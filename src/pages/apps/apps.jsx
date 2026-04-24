import React from "react";
import { useLocation } from "react-router-dom";

import PublicHeader from "../../components/header/public/publicheader.jsx";
import Footer from "../../components/footer/footer.jsx";
import LiveChat from "../../components/live-chat/live-chat.jsx";

import "./apps.css";

/* ---------------- App Store Smart Links ----------------
   Replace with your real IDs before shipping. */
const APPLE_APP_ID = "0000000000";        // iOS/macOS App Store ID
const PLAY_PACKAGE = "com.guga.app";      // Android package name

// Native schemes and canonical web URLs
const APPLE_NATIVE_MOBILE = `itms-apps://itunes.apple.com/app/id${APPLE_APP_ID}`;
const APPLE_NATIVE_MAC    = `macappstore://itunes.apple.com/app/id${APPLE_APP_ID}`;
const APPLE_WEB           = `https://apps.apple.com/app/id${APPLE_APP_ID}`;
const GOOGLE_WEB          = `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}`;

/* -------- Platform detection (SSR-safe) -------- */
function getUA() {
  if (typeof navigator === "undefined") return { ua: "", platform: "", maxTouchPoints: 0, userAgentData: null };
  return {
    ua: navigator.userAgent || navigator.vendor || (typeof window !== "undefined" && window.opera) || "",
    platform: navigator.platform || "",
    maxTouchPoints: navigator.maxTouchPoints || 0,
    userAgentData: navigator.userAgentData || null,
  };
}

function detectPlatform() {
  const { ua, platform, maxTouchPoints, userAgentData } = getUA();
  const brands = userAgentData?.brands?.map(b => b.brand.toLowerCase()) || [];
  const uaLower = ua.toLowerCase();

  const isAndroidCH = brands.some(b => b.includes("android")) || uaLower.includes("android");
  const isIOSDeviceUA = /iphone|ipod|ipad/.test(uaLower);
  const isIPadOnMac = (platform === "MacIntel" && maxTouchPoints > 1);
  const isIOS = isIOSDeviceUA || isIPadOnMac;

  const isMacDesktop =
    (/macintosh|mac os x/.test(uaLower) && !isIPadOnMac) || brands.some(b => b.includes("mac"));

  return { isAndroid: isAndroidCH, isIOS, isMacDesktop };
}

/* Try opening native scheme; fall back to the web listing if blocked */
function tryOpen(primaryUrl, fallbackUrl) {
  if (typeof window === "undefined") return;
  let win = null;
  try {
    win = window.open(primaryUrl, "_blank", "noopener,noreferrer");
  } catch {
    window.open(fallbackUrl, "_blank", "noopener,noreferrer");
    return;
  }
  setTimeout(() => {
    if (!win || win.closed || typeof win.closed === "undefined") {
      window.open(fallbackUrl, "_blank", "noopener,noreferrer");
    }
  }, 250);
}

export function openStore() {
  const { isAndroid, isIOS, isMacDesktop } = detectPlatform();

  if (isIOS) {
    tryOpen(APPLE_NATIVE_MOBILE, APPLE_WEB);
    return;
  }
  if (isAndroid) {
    window.open(GOOGLE_WEB, "_blank", "noopener,noreferrer");
    return;
  }
  if (isMacDesktop) {
    tryOpen(APPLE_NATIVE_MAC, APPLE_WEB);
    return;
  }
  window.open(APPLE_WEB, "_blank", "noopener,noreferrer");
}

export default function Apps({ variant = "public" }) {
  const location = useLocation();
  const isCarrierContext =
    variant !== "public" || location.pathname.startsWith("/carrier");

  const Content = (
    <main className="apps-page" role="main">
      {/* Hero */}
      <header className="apps-hero" aria-labelledby="apps-hero-title">
        <div className="apps-hero-inner">
          <h1 id="apps-hero-title">Mobile App (iOS / Android)</h1>
          <p className="apps-hero-sub">
            Manage loads, bids, tracking, inspections, and paperwork right from your phone.
          </p>

          <div className="apps-platforms" role="list">
            <div className="apps-platform-card" role="listitem">
              <div className="apps-platform-title">
                <span className="apps-dot" aria-hidden="true" />
                iOS
              </div>
              <p className="apps-platform-text">Optimized for iPhone and iPad.</p>
            </div>
            <div className="apps-platform-card" role="listitem">
              <div className="apps-platform-title">
                <span className="apps-dot" aria-hidden="true" />
                Android
              </div>
              <p className="apps-platform-text">Works across leading Android devices.</p>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="apps-section">
        <h2>Everything your driver needs on the road</h2>
        <div className="apps-grid">
          <div className="apps-card">
            <h3>Pickup &amp; Delivery Inspections</h3>
            <p>
              Guided vehicle inspection with required photo angles and condition notes. Photos are
              auto-compressed and timestamped for reliable uploads.
            </p>
          </div>
          <div className="apps-card">
            <h3>e-Signature BOL &amp; POD</h3>
            <p>
              Digital Bill of Lading and Proof of Delivery captured in-app. Signed PDFs attach to
              the load instantly.
            </p>
          </div>
          <div className="apps-card">
            <h3>Auto-Upload to the System</h3>
            <p>
              Photos, notes, and signed docs sync to your Jashi Logistics dashboard and become visible to
              customers in real time.
            </p>
          </div>
          <div className="apps-card">
            <h3>Live Status &amp; Location</h3>
            <p>
              Optional background location while a load is active provides live ETA and status
              updates.
            </p>
          </div>
          <div className="apps-card">
            <h3>Document Scanner</h3>
            <p>
              Edge detection, perspective fix, and multi-page bundling (permits, invoices) into a
              single PDF.
            </p>
          </div>
          <div className="apps-card">
            <h3>Offline-First</h3>
            <p>No signal? Work continues. Items queue locally and sync when the device reconnects.</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="apps-section">
        <h2>How it works</h2>
        <ol className="apps-steps">
          <li><span className="apps-step-num">1</span>Dispatcher assigns a load in Jashi Logistics and shares it to the driver’s phone.</li>
          <li><span className="apps-step-num">2</span>Driver follows the pickup checklist and captures required photos.</li>
          <li><span className="apps-step-num">3</span>BOL is reviewed and signed; documents upload automatically.</li>
          <li><span className="apps-step-num">4</span>En-route, the app can share status and ETA (driver-controlled privacy).</li>
          <li><span className="apps-step-num">5</span>On delivery, driver captures a quick inspection and POD e-signature.</li>
          <li><span className="apps-step-num">6</span>Everything is instantly available in your portal for billing &amp; claims.</li>
        </ol>
      </section>

      {/* Compliance */}
      <section className="apps-section">
        <h2>Compliance &amp; security</h2>
        <ul className="apps-list">
          <li>Time-stamped media with an immutable audit trail per load.</li>
          <li>Role-based access; drivers only see assigned loads.</li>
          <li>At-rest and in-transit encryption with versioned storage.</li>
          <li>GDPR/CCPA-respecting privacy controls.</li>
        </ul>
      </section>

      {/* CTA */}
      <section className="apps-section apps-cta">
        <div className="apps-cta-inner">
          <div className="apps-cta-copy">
            <h2>Ready to use the mobile app?</h2>
            <p>
              Drivers receive their app link as soon as you assign a load. You can also invite drivers from here at any time.
            </p>
          </div>

          <div className="apps-cta-actions">
            <button
              type="button"
              className="apps-btn apps-cta-item primary"
              onClick={openStore}
            >
              Download App
            </button>
            {/* Removed explicit App Store / Google Play links */}
          </div>
        </div>
      </section>
    </main>
  );

  // Carrier context (in-app) shows bare page without public header/footer
  if (isCarrierContext) return <div className="page-shell apps apps--bare">{Content}</div>;

  // Public marketing page
  return (
    <div className="page-shell apps">
      <PublicHeader />
      {Content}
      <Footer />
      <LiveChat />
    </div>
  );
}
