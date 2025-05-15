
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Comment out the problematic import
// Instead of importing from the package directly, we'll use the type defined in our declaration file
// and check for the existence of the function before calling it
declare global {
  interface Window {
    __LOVABLE_TAGGER__?: () => void;
  }
}

// Only attempt to register tagger in development if it exists
if (import.meta.env.DEV && window.__LOVABLE_TAGGER__) {
  window.__LOVABLE_TAGGER__();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
