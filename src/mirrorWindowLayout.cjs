// Same physical safe area as --mirror-top-inset: calc(4vh + 44px).
function mirrorSafeArea(bounds) {
  const inset = Math.min(Math.max(0, bounds.height - 100), Math.round(bounds.height * .04 + 44));
  return { x: bounds.x, y: bounds.y + inset, width: bounds.width, height: bounds.height - inset };
}
function managedBrowserBounds(bounds, expanded = false) {
  const safe = mirrorSafeArea(bounds), margin = expanded ? 0 : Math.max(6, Math.round(safe.width * .014));
  return { x: Math.round(safe.x + margin), y: Math.round(safe.y + margin),
    width: Math.max(100, Math.round(safe.width - 2 * margin)),
    height: Math.max(100, Math.round(safe.height * (expanded ? 1 : .68) - (expanded ? 0 : margin))) };
}
module.exports = { mirrorSafeArea, managedBrowserBounds };
