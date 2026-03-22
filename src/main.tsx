import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

function removeBoot() {
  const el = document.getElementById('boot')
  if (!el) return
  el.classList.add('done')
  // Remove from DOM after transition to free memory
  setTimeout(() => el.remove(), 350)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App onMount={removeBoot} />
  </React.StrictMode>,
)
