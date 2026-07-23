import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Expõe o servidor de dev na rede local (0.0.0.0),
    // necessário para abrir pelo celular via IP do PC.
    host: true,
    port: 5173,
  },
})
