/** Safe vibration wrapper — silently no-ops on unsupported environments */
export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Ignore vibration errors on unsupported or restricted environments
  }
}
