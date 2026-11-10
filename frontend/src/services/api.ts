import axios from 'axios';
import { cacheGet, cacheSet, getTtl, invalidateByMutation, cacheClear, cacheAge } from './cache';

// Em desenvolvimento, defina VITE_API_URL no arquivo .env da pasta frontend/
// apontando para o IP da máquina que roda o backend (ex: http://192.168.0.10:8000).
// Isso é necessário para acessar o sistema pelo celular na mesma rede Wi-Fi,
// já que "localhost" no celular aponta para o próprio celular, não para o PC.
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL,
});

// Sem tempo limite, uma requisição perdida (ex.: enquanto o Render acorda)
// deixava a tela carregando para sempre. Leituras: 25s (e são repetidas).
// Escritas: 70s, porque não são repetidas e o servidor pode estar acordando.
const TIMEOUT_LEITURA_MS = 25_000;
const TIMEOUT_ESCRITA_MS = 70_000;

// ─── Servidor acordando / fora do ar ──────────────────────────────────────────
// No plano gratuito o Render desliga o backend após 15 min sem uso e leva de
// 30s a 1min para religar. Leituras (GET) que falham por rede, tempo esgotado ou
// 502/503/504 são repetidas sozinhas com espera crescente (~1min no total).
// Escritas (POST/PUT/DELETE) NUNCA são repetidas: poderiam duplicar uma venda.
const ESPERAS_RETRY_MS = [1500, 3000, 6000, 10_000, 15_000, 20_000];
const avisarConexao = (estado: 'tentando' | 'ok' | 'falhou') =>
  window.dispatchEvent(new CustomEvent('api-conexao', { detail: estado }));

const ehFalhaDeConexao = (error: any) =>
  !error.response || [502, 503, 504].includes(error.response.status);

// ─── Indicador global de carregamento ─────────────────────────────────────────
// Conta requisições em andamento e avisa a barra de progresso do topo
// (evento 'api-carregando'). Requisições "silenciosas" — revalidação em segundo
// plano e pré-carregamento — não acendem a barra.
let pendentes = 0;
const avisarCarregamento = () =>
  window.dispatchEvent(new CustomEvent<number>('api-carregando', { detail: pendentes }));
const encerrarContagem = (config: any) => {
  if (config && config.__contado) {
    config.__contado = false;
    pendentes = Math.max(0, pendentes - 1);
    avisarCarregamento();
  }
};

// ─── Auth token em cada request ────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (!config.timeout) {
      config.timeout = (config.method || 'get').toLowerCase() === 'get' ? TIMEOUT_LEITURA_MS : TIMEOUT_ESCRITA_MS;
    }
    if (!(config as any).silencioso) {
      (config as any).__contado = true;
      pendentes += 1;
      avisarCarregamento();
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Cache interceptor (response) ──────────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    encerrarContagem(response.config);
    if ((response.config as any).__tentativa && !(response.config as any).silencioso) avisarConexao('ok');
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
  async (error) => {
    encerrarContagem(error.config);
    const cfg = error.config as any;

    if (cfg && !axios.isCancel(error) && ehFalhaDeConexao(error) && (cfg.method || 'get').toLowerCase() === 'get') {
      const tentativa = cfg.__tentativa || 0;
      if (tentativa < ESPERAS_RETRY_MS.length) {
        cfg.__tentativa = tentativa + 1;
        if (!cfg.silencioso) avisarConexao('tentando');
        await new Promise((r) => setTimeout(r, ESPERAS_RETRY_MS[tentativa]));
        return api(cfg);
      }
      if (!cfg.silencioso) avisarConexao('falhou');
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      cacheClear();
      window.dispatchEvent(new Event('unauthorized'));
    }
    return Promise.reject(error);
  }
);

// ─── Requisições em andamento (deduplicação) ──────────────────────────────────
// Se a mesma URL+parâmetros já está sendo buscada, quem pedir de novo recebe a
// MESMA promessa em vez de disparar outra ida ao servidor. Antes, abrir uma tela
// sem cache disparava 2 requisições idênticas (SWR + fetch normal).
const emAndamento = new Map<string, Promise<unknown>>();

function chaveDe(url: string, params?: Record<string, string>): string {
  const queryString = params ? new URLSearchParams(params).toString() : '';
  return `${url}?${queryString}`;
}

function buscarCompartilhado<T>(url: string, params?: Record<string, string>, silencioso = false): Promise<T> {
  const chave = chaveDe(url, params);
  const existente = emAndamento.get(chave);
  if (existente) return existente as Promise<T>;
  const req = api
    .get<T>(url, { params, silencioso } as any)
    .then((res) => res.data)
    .finally(() => emAndamento.delete(chave));
  emAndamento.set(chave, req);
  return req;
}

/** Revalidação em segundo plano só se o dado em cache tiver mais que isso. */
const JANELA_REVALIDACAO_MS = 15_000;

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
  const cached = cacheGet(chaveDe(url, params));
  if (cached !== null) {
    return cached as T;
  }
  return buscarCompartilhado<T>(url, params);
}

/**
 * Pré-carrega uma rota no cache (ex.: ao passar o mouse num item do menu).
 * Silencioso: erros são ignorados e nada acontece se o cache já estiver quente.
 */
export function apiPrefetch(url: string, params?: Record<string, string>): void {
  if (cacheGet(chaveDe(url, params)) !== null) return;
  buscarCompartilhado(url, params, true).catch(() => {});
}

/**
 * Stale-while-revalidate: retorna dados do cache instantaneamente (ou null)
 * e dispara revalidação em background. O callback `onUpdate` é chamado
 * quando a resposta da rede chega (se diferente do cache).
 * Cache com menos de 15s não é revalidado (evita ir ao servidor a cada
 * troca de tela); mutações já invalidam o cache na hora.
 */
export function apiGetSWR<T = unknown>(
  url: string,
  params: Record<string, string> | undefined,
  onUpdate: (data: T) => void
): T | null {
  const cacheKey = chaveDe(url, params);
  const cached = cacheGet(cacheKey) as T | null;

  if (cached !== null && cacheAge(cacheKey) < JANELA_REVALIDACAO_MS) {
    return cached;
  }

  // Com cache na tela, a atualização é em segundo plano (sem barra de progresso)
  buscarCompartilhado<T>(url, params, cached !== null)
    .then((data) => {
      // Só chama onUpdate se os dados são diferentes do cache atual
      const newJson = JSON.stringify(data);
      const cachedJson = cached !== null ? JSON.stringify(cached) : null;
      if (newJson !== cachedJson) {
        onUpdate(data);
      }
    })
    .catch(() => {/* silencioso — quem chamou trata o erro pelo próprio fluxo */});

  return cached;
}

/**
 * Acorda o backend assim que o app abre (ex.: enquanto a pessoa digita o login),
 * para que as primeiras telas não esperem o servidor gratuito religar.
 */
export function acordarServidor(): void {
  api.get('/', { silencioso: true, timeout: TIMEOUT_ESCRITA_MS } as any).catch(() => {});
}
