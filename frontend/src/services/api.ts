import axios from 'axios';
import { cacheGet, cacheSet, getTtl, invalidateByMutation, cacheClear } from './cache';

// Em desenvolvimento, defina VITE_API_URL no arquivo .env da pasta frontend/
// apontando para o IP da máquina que roda o backend (ex: http://192.168.0.10:8000).
// Isso é necessário para acessar o sistema pelo celular na mesma rede Wi-Fi,
// já que "localhost" no celular aponta para o próprio celular, não para o PC.
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL,
});

// ─── Auth token em cada request ────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Cache interceptor (response) ──────────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toLowerCase();
    const url = response.config.url || '';

    if (method === 'get') {
      // Monta chave completa: url + query string
      const fullKey = `${url}?${response.config.params ? new URLSearchParams(response.config.params).toString() : ''}`;
      const ttl = getTtl(url);
      cacheSet(fullKey, response.data, ttl);
    } else {
      // Mutação: invalida caches relacionados
      invalidateByMutation(url);
    }

    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      cacheClear();
      window.dispatchEvent(new Event('unauthorized'));
    }
    return Promise.reject(error);
  }
);

/**
 * Versão com cache de api.get — serve do cache imediatamente se disponível,
 * e retorna uma Promise que resolve com os dados (cache ou rede).
 *
 * Uso:
 *   const data = await apiGet('/plataformas/');
 */
export async function apiGet<T = unknown>(
  url: string,
  params?: Record<string, string>
): Promise<T> {
  const queryString = params ? new URLSearchParams(params).toString() : '';
  const cacheKey = `${url}?${queryString}`;

  const cached = cacheGet(cacheKey);
  if (cached !== null) {
    return cached as T;
  }

  const res = await api.get<T>(url, { params });
  return res.data;
}

/**
 * Stale-while-revalidate: retorna dados do cache instantaneamente (ou null)
 * e dispara revalidação em background. O callback `onUpdate` é chamado
 * quando a resposta da rede chega (se diferente do cache).
 */
export function apiGetSWR<T = unknown>(
  url: string,
  params: Record<string, string> | undefined,
  onUpdate: (data: T) => void
): T | null {
  const queryString = params ? new URLSearchParams(params).toString() : '';
  const cacheKey = `${url}?${queryString}`;

  const cached = cacheGet(cacheKey) as T | null;

  // Revalida em background sempre
  api
    .get<T>(url, { params })
    .then((res) => {
      // Só chama onUpdate se os dados são diferentes do cache atual
      const newJson = JSON.stringify(res.data);
      const cachedJson = cached !== null ? JSON.stringify(cached) : null;
      if (newJson !== cachedJson) {
        onUpdate(res.data);
      }
    })
    .catch(() => {/* silencioso — cache já serviu */});

  return cached;
}
