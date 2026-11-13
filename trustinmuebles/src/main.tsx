import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { sincronizarIndexacion } from './lib/sitio'

// v1.0 (etapa 6): meta robots según app.sitio.indexable (por omisión, noindex).
void sincronizarIndexacion()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
