import React, { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import CarrierHeader from '../components/header/carrier/carrierheader.jsx';
import CarrierFooter from '../components/footer/carrier-dashboard-footer.jsx';

const LiveChat = React.lazy(() => import('../components/live-chat/live-chat.jsx'));

/**
 * CarrierLayout
 * - Wrap all carrier routes with this layout to automatically render:
 *   - CarrierHeader
 *   - Lazy-loaded LiveChat
 *   - CarrierDashboardFooter
 * - To hide chrome (header/chat/footer) on specific paths (e.g., auth/privacy),
 *   edit the regex list below.
 */
export default function CarrierLayout() {
  const { pathname } = useLocation();

  // Adjust these patterns if you have other routes that should hide layout chrome
  const hideChromeOn = [/^\/auth/, /^\/privacy/, /^\/security/];
  const hideChrome = hideChromeOn.some((rx) => rx.test(pathname));

  return (
    <>
      {!hideChrome && <CarrierHeader />}

      <main className="page-shell">
        <Outlet />
      </main>

      {!hideChrome && (
        <>
          <Suspense fallback={null}>
            <LiveChat />
          </Suspense>
          <CarrierFooter />
        </>
      )}
    </>
  );
}
