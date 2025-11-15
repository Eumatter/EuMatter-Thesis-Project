import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AppContextProvider } from './context/AppContext.jsx'
import axios from 'axios'
import { getBackendOrigin } from './utils/backendUrl.js'
import { applySafariFixes, isBrowserSupported } from './utils/browserCompatibility.js'

// Initialize browser compatibility fixes
applySafariFixes()

// Check browser support
if (!isBrowserSupported()) {
    console.warn('Browser may not be fully supported. Some features may not work correctly.')
}

axios.defaults.baseURL = getBackendOrigin()
axios.defaults.withCredentials = true

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AppContextProvider>
      <App />
    </AppContextProvider>
  </BrowserRouter>
)
