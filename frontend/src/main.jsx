import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AppContextProvider } from './context/AppContext.jsx'
import axios from 'axios'
import { getBackendOrigin } from './utils/backendUrl.js'

axios.defaults.baseURL = getBackendOrigin()
axios.defaults.withCredentials = true

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AppContextProvider>
      <App />
    </AppContextProvider>
  </BrowserRouter>
)
