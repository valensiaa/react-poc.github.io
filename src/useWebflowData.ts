/**
 * Reads data-* attributes from the React mount element and merges with defaults.
 * In Webflow, these attributes are bound to CMS fields in the Custom HTML Embed.
 * In local dev, the defaults are used as fallback so the component still renders.
 */
export function useWebflowData<T extends Record<string, string | object | number>>(
  elementId: string,
  defaults: T
): T {
  const el = document.getElementById(elementId)
  if (!el) return defaults

  const result = { ...defaults }

  for (const key of Object.keys(defaults)) {
    const raw = el.dataset[key]
    if (raw === undefined) continue

    const defaultVal = defaults[key]
    if (typeof defaultVal === 'object') {
      try {
        (result as Record<string, unknown>)[key] = JSON.parse(raw)
      } catch {
        // malformed JSON — keep default
      }
    } else if (typeof defaultVal === 'number') {
      const parsed = Number(raw)
      if (!isNaN(parsed)) (result as Record<string, unknown>)[key] = parsed
    } else {
      (result as Record<string, unknown>)[key] = raw
    }
  }

  return result
}
