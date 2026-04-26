import { useEffect } from 'react';

/**
 * iOS-safe body scroll lock.
 *
 * The simple `body { overflow: hidden }` lock leaks on iOS Safari — the
 * browser will still rubber-band the page behind a fixed modal. The
 * production-grade pattern is:
 *
 *   1. Save current `window.scrollY`.
 *   2. Fix `<body>` in place at top: `-scrollY` so the visible viewport
 *      stays where the user left it.
 *   3. Lock `<html>`/`<body>` overflow + overscroll-behavior + touch-action.
 *   4. Block `touchmove` on the document with preventDefault — but
 *      ALLOW touchmove inside any descendant that's a real overflow
 *      scroll container (the chat sheet body, the auth modal content).
 *      That keeps internal scrolling alive while the page is frozen.
 *   5. On unlock, restore everything and `window.scrollTo(0, scrollY)`
 *      so the page doesn't appear to jump.
 *
 * Layered locks (e.g. user opens the auth modal from inside a sheet)
 * each save their own scrollY at activation, so the deepest release
 * restores correctly.
 */
export default function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return;

    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    const prev = {
      htmlOverflow: html.style.overflow,
      htmlOverscrollBehavior: html.style.overscrollBehavior,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
      bodyTouchAction: body.style.touchAction,
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    body.style.touchAction = 'none';
    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';

    // Prevent touchmove from scrolling the page, except when the touch
    // started inside a real overflow scroll container that has more
    // content than fits.
    const isInsideScrollContainer = (el) => {
      let node = el;
      while (node && node !== body) {
        const style = window.getComputedStyle(node);
        const oy = style.overflowY;
        if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight) {
          return true;
        }
        node = node.parentElement;
      }
      return false;
    };

    const onTouchMove = (e) => {
      if (e.touches && e.touches.length > 1) return; // pinch / multi — let it pass
      if (isInsideScrollContainer(e.target)) return;
      // Otherwise this touchmove would propagate to the page — block it.
      if (e.cancelable) e.preventDefault();
    };

    document.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.left = prev.bodyLeft;
      body.style.right = prev.bodyRight;
      body.style.width = prev.bodyWidth;
      body.style.overflow = prev.bodyOverflow;
      body.style.overscrollBehavior = prev.bodyOverscrollBehavior;
      body.style.touchAction = prev.bodyTouchAction;
      html.style.overflow = prev.htmlOverflow;
      html.style.overscrollBehavior = prev.htmlOverscrollBehavior;

      document.removeEventListener('touchmove', onTouchMove);

      // Restore the user's scroll position.
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
