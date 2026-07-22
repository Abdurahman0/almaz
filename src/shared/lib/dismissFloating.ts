/**
 * Close every open floating layer (Radix popovers/selects/menus/tooltips and
 * our custom panels). Radix DismissableLayer listens for Escape on document,
 * so a synthetic Escape closes the top-most layer; we repeat across frames to
 * unwind stacked layers. Called on every route change so nothing portaled to
 * <body> is left behind by the page transition.
 */
export function dismissAllFloating(): void {
  const fire = () =>
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  fire();
  requestAnimationFrame(() => {
    fire();
    requestAnimationFrame(fire);
  });
  // Drop focus out of any trigger so Radix doesn't reopen on focus handlers.
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}
