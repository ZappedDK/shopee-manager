import axios from 'axios';

// Em desenvolvimento, defina VITE_API_URL no arquivo .env da pasta frontend/
// apontando para o IP da máquina que roda o backend (ex: http://192.168.0.10:8000).
// Isso é necessário para acessar o sistema pelo celular na mesma rede Wi-Fi,
// já que "localhost" no celular aponta para o próprio celular, não para o PC.
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL,
});
