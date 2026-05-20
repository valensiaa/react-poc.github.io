import { useEffect, useRef, useState } from 'react'
import { useWebflowData } from './useWebflowData'

const GOOGLE_MAPS_API_KEY = 'AIzaSyDZb6Fw2SUXdJ5P3YyJEryVa8D8dInwh8o'

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

type MapData = {
  name: string
  email: string
  phone: string
  address: string
  lat: number
  lng: number
  zoom: number
  [key: string]: string | number
}

export default function GoogleMap({ elementId = 'react-map-root' }: { elementId?: string }) {
  const data = useWebflowData<MapData>(elementId, {
    name: 'Your Site Name',
    email: 'info@example.com',
    phone: '+31 00 000 0000',
    address: 'Please fill in your address',
    lat: 52.3676,
    lng: 4.9041,
    zoom: 15,
  })

  const mapRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    loadGoogleMaps()
      .then(google => {
        if (cancelled || !mapRef.current) return

        const position = { lat: Number(data.lat), lng: Number(data.lng) }

        const map = new google.maps.Map(mapRef.current, {
          center: position,
          zoom: Number(data.zoom) || 15,
          styles: GRAYSCALE_STYLE,
          disableDefaultUI: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          clickableIcons: false,
        })

        const marker = new google.maps.Marker({
          position,
          map,
          title: data.name,
          icon: {
            url: YELLOW_PIN_SVG,
            scaledSize: new google.maps.Size(40, 52),
            anchor: new google.maps.Point(20, 52),
          },
        })

        const infoContent = `
          <div class="gmap-tooltip">
            <h3 class="gmap-tooltip__title">${escapeHtml(data.name)}</h3>
            <ul class="gmap-tooltip__list">
              <li><strong>Address:</strong> ${escapeHtml(data.address)}</li>
              <li><strong>Email:</strong> <a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></li>
              <li><strong>Phone:</strong> <a href="tel:${escapeHtml(data.phone.replace(/\s+/g, ''))}">${escapeHtml(data.phone)}</a></li>
            </ul>
          </div>
        `

        const infoWindow = new google.maps.InfoWindow({ content: infoContent })

        let stickyOpen = false
        let hoverCloseTimer: number | null = null

        const openWindow = () => {
          if (hoverCloseTimer) { window.clearTimeout(hoverCloseTimer); hoverCloseTimer = null }
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
        infoWindow.addListener('closeclick', () => { stickyOpen = false })
      })
      .catch(err => {
        console.error('Google Maps failed to load', err)
        if (!cancelled) setError('Unable to load map. Check API key and network.')
      })

    return () => { cancelled = true }
  }, [data.name, data.email, data.phone, data.address, data.lat, data.lng, data.zoom])

  if (error) return <div className="gmap-error">{error}</div>

  return <div ref={mapRef} className="gmap" />
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
