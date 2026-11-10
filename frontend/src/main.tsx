import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { acordarServidor } from './services/api'
import { BarraProgresso, AvisoConexao } from './ui'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}

acordarServidor()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BarraProgresso />
    <App />
    <AvisoConexao />
  </StrictMode>,
)
