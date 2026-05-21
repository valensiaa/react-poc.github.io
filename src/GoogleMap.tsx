import { useEffect, useRef, useState } from 'react'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined

const GRAYSCALE_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ saturation: -100 }] },
  { elementType: 'labels.text.fill', stylers: [{ saturation: -100 }, { lightness: -20 }] },
  { elementType: 'labels.text.stroke', stylers: [{ saturation: -100 }, { lightness: 80 }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ saturation: -100 }, { lightness: 20 }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ saturation: -100 }, { lightness: 30 }] },
  { featureType: 'landscape', stylers: [{ saturation: -100 }] },
]

const YELLOW_PIN_SVG =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">
      <path d="M20 0C8.95 0 0 8.95 0 20c0 14 20 32 20 32s20-18 20-32C40 8.95 31.05 0 20 0z"
            fill="#FFC107" stroke="#1a1a1a" stroke-width="2"/>
      <circle cx="20" cy="20" r="7" fill="#1a1a1a"/>
    </svg>
  `)

let mapsLoaderPromise: Promise<typeof google> | null = null

function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window !== 'undefined' && (window as any).google?.maps) {
    return Promise.resolve((window as any).google)
  }
  if (mapsLoaderPromise) return mapsLoaderPromise
  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY in build env'))
  }

  mapsLoaderPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps-loader]')
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).google))
      existing.addEventListener('error', reject)
      return
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&v=weekly`
    script.async = true
    script.defer = true
    script.dataset.googleMapsLoader = 'true'
    script.onload = () => resolve((window as any).google)
    script.onerror = reject
    document.head.appendChild(script)
  })

  return mapsLoaderPromise
}

type Location = {
  name: string
  email: string
  phone: string
  address: string
  lat: number
  lng: number
}

const DEFAULT_LOCATION: Location = {
  name: 'Your Site Name',
  email: 'info@example.com',
  phone: '+31 00 000 0000',
  address: 'Please fill in your address',
  lat: 52.3676,
  lng: 4.9041,
}

function parseLocation(el: HTMLElement): Location | null {
  const lat = Number(el.dataset.lat)
  const lng = Number(el.dataset.lng)
  if (!isFinite(lat) || !isFinite(lng)) return null
  return {
    name: el.dataset.name || '',
    email: el.dataset.email || '',
    phone: el.dataset.phone || '',
    address: el.dataset.address || '',
    lat,
    lng,
  }
}

/**
 * Pins come from one of two places, in priority order:
 *   1. Any `.react-map-location` elements anywhere on the page — driven by a
 *      Webflow Collection List (one Code Embed per Collection Item).
 *   2. Legacy fallback: `data-*` attributes on the map root itself (single pin).
 *   3. Last resort: a placeholder so dev preview still renders.
 */
function collectLocations(root: HTMLElement): Location[] {
  const childEls = Array.from(document.querySelectorAll<HTMLElement>('.react-map-location'))
  const childLocations = childEls
    .map(parseLocation)
    .filter((l): l is Location => l !== null)
  if (childLocations.length > 0) return childLocations

  const single = parseLocation(root)
  if (single) return [single]

  return [DEFAULT_LOCATION]
}

export default function GoogleMap({ elementId = 'react-map-root' }: { elementId?: string }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const root = document.getElementById(elementId)
    const locations = root ? collectLocations(root) : [DEFAULT_LOCATION]
    const rootZoom = root ? Number(root.dataset.zoom) : NaN
    const fitBounds = root?.dataset.fitBounds !== 'false'

    loadGoogleMaps()
      .then(google => {
        if (cancelled || !mapRef.current) return

        const initialCenter = { lat: locations[0].lat, lng: locations[0].lng }
        const map = new google.maps.Map(mapRef.current, {
          center: initialCenter,
          zoom: isFinite(rootZoom) ? rootZoom : 15,
          styles: GRAYSCALE_STYLE,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          clickableIcons: false,
        })

        const allWindows: google.maps.InfoWindow[] = []
        const closeOthers = (current: google.maps.InfoWindow) => {
          allWindows.forEach(w => {
            if (w !== current) w.close()
          })
        }

        const bounds = new google.maps.LatLngBounds()

        locations.forEach(loc => {
          const position = { lat: loc.lat, lng: loc.lng }
          bounds.extend(position)

          const marker = new google.maps.Marker({
            position,
            map,
            title: loc.name,
            icon: {
              url: YELLOW_PIN_SVG,
              scaledSize: new google.maps.Size(40, 52),
              anchor: new google.maps.Point(20, 52),
            },
          })

          const infoWindow = new google.maps.InfoWindow({ content: buildInfoContent(loc) })
          allWindows.push(infoWindow)

          let stickyOpen = false
          let hoverCloseTimer: number | null = null

          const openWindow = () => {
            if (hoverCloseTimer) {
              window.clearTimeout(hoverCloseTimer)
              hoverCloseTimer = null
            }
            closeOthers(infoWindow)
            infoWindow.open({ map, anchor: marker })
          }
          const closeSoon = () => {
            if (stickyOpen) return
            hoverCloseTimer = window.setTimeout(() => infoWindow.close(), 200)
          }

          marker.addListener('mouseover', openWindow)
          marker.addListener('mouseout', closeSoon)
          marker.addListener('click', () => {
            stickyOpen = !stickyOpen
            if (stickyOpen) openWindow()
            else infoWindow.close()
          })
          infoWindow.addListener('closeclick', () => {
            stickyOpen = false
          })
        })

        // With 2+ pins, fit the viewport around all of them.
        // User can opt out with data-fit-bounds="false" on the root.
        if (locations.length > 1 && fitBounds) {
          map.fitBounds(bounds, 64)
        }
      })
      .catch(err => {
        console.error('Google Maps failed to load', err)
        if (!cancelled) setError('Unable to load map. Check API key and network.')
      })

    return () => {
      cancelled = true
    }
  }, [elementId])

  if (error) return <div className="gmap-error">{error}</div>
  return <div ref={mapRef} className="gmap" />
}

function buildInfoContent(loc: Location): string {
  const rows: string[] = []
  if (loc.address) {
    rows.push(`<li><strong>Address:</strong> ${escapeHtml(loc.address)}</li>`)
  }
  if (loc.email) {
    rows.push(
      `<li><strong>Email:</strong> <a href="mailto:${escapeHtml(loc.email)}">${escapeHtml(loc.email)}</a></li>`
    )
  }
  if (loc.phone) {
    const telLink = loc.phone.replace(/\s+/g, '')
    rows.push(
      `<li><strong>Phone:</strong> <a href="tel:${escapeHtml(telLink)}">${escapeHtml(loc.phone)}</a></li>`
    )
  }
  return `
    <div class="gmap-tooltip">
      <h3 class="gmap-tooltip__title">${escapeHtml(loc.name || 'Location')}</h3>
      ${rows.length ? `<ul class="gmap-tooltip__list">${rows.join('')}</ul>` : ''}
    </div>
  `
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
