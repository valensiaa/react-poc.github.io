import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import GoogleMap from './GoogleMap'
import './App.css'

const productContainer = document.getElementById('react-root')
if (productContainer) {
  createRoot(productContainer).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

const mapContainer = document.getElementById('react-map-root')
if (mapContainer) {
  createRoot(mapContainer).render(
    <StrictMode>
      <GoogleMap />
    </StrictMode>
  )
}
