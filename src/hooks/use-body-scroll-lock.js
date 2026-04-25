import { useEffect } from 'react';

/**
 * Reusable iOS-friendly body scroll lock. When `active` is true, the
 * page behind the open modal/sheet stops scrolling and the user's
 * scroll position is preserved when the lock releases.
 *
 * iOS Safari quirks this addresses:
 *   - `overflow: hidden` on body alone doesn't stop the page from
 *     rubber-band scrolling — you must also fix the body in place.
 *   - When the body is fixed, the visible viewport "snaps" to top; we
 *     compensate by translating the body up by the current scrollY so
 *     the visible content stays in the same place.
 *   - On unlock, restore the saved styles AND scroll the window back to
 *     the original position so the page doesn't appear to jump.
 *
 * Layered locks (e.g. modal opens chat) — last-released wins for restoring
 * scrollY because each instance saves the scrollY at the moment it
 * activates. That's normally what you want.
 */
export default function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return;

    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    const prev = {
      htmlOverflow: html.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';

    return () => {
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.left = prev.bodyLeft;
      body.style.right = prev.bodyRight;
      body.style.width = prev.bodyWidth;
      body.style.overflow = prev.bodyOverflow;
      html.style.overflow = prev.htmlOverflow;

      // Restore the user's scroll position. window.scrollTo with the
      // 'instant' behavior avoids any animation that could feel laggy.
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
