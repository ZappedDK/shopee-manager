/**
 * cache.ts — Cache em memória com TTL para o frontend
 *
 * TTL padrão por prefixo de rota:
 *  /plataformas/          → 5 min
 *  /embalagens/           → 5 min
 *  /configuracoes/        → 5 min
 *  /produtos/alertas      → 2 min
 *  /relatorios/vendas     → 3 min
 *  /relatorios/produtos-sem-venda → 2 min
 *  /produtos/detalhados   → 1 min
 *  /produtos/movimentacoes→ 2 min
 *  (default)              → 1 min
 */

interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number; // ms
}

const DEFAULT_TTL = 60_000; // 1 minuto

const TTL_MAP: Array<[string, number]> = [
  ['/plataformas', 5 * 60_000],
  ['/embalagens', 5 * 60_000],
  ['/configuracoes', 5 * 60_000],
  ['/produtos/alertas', 2 * 60_000],
  ['/relatorios/vendas', 3 * 60_000],
  ['/relatorios/produtos-sem-venda', 2 * 60_000],
  ['/produtos/movimentacoes', 2 * 60_000],
  ['/produtos/detalhados', 60_000],
];

/** Escolhe o TTL baseado no prefixo da URL */
export function getTtl(url: string): number {
  for (const [prefix, ttl] of TTL_MAP) {
    if (url.includes(prefix)) return ttl;
  }
  return DEFAULT_TTL;
}

const store = new Map<string, CacheEntry>();

/** Armazena um dado no cache */
export function cacheSet(key: string, data: unknown, ttl: number): void {
  store.set(key, { data, timestamp: Date.now(), ttl });
}

/** Recupera um dado do cache (retorna null se expirado ou ausente) */
export function cacheGet(key: string): unknown | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

/** Invalida todas as chaves cujo início bate com algum dos prefixos fornecidos */
export function cacheInvalidate(...prefixes: string[]): void {
  for (const key of store.keys()) {
    if (prefixes.some((p) => key.includes(p))) {
      store.delete(key);
    }
  }
}

/** Limpa todo o cache (usado no logout) */
export function cacheClear(): void {
  store.clear();
}

/** Mapa de mutação → rotas que devem ser invalidadas */
const INVALIDATION_MAP: Array<[string, string[]]> = [
  ['/produtos', ['/produtos', '/relatorios']],
  ['/embalagens', ['/embalagens']],
  ['/plataformas', ['/plataformas', '/produtos']],
  ['/configuracoes', ['/configuracoes']],
  ['/vendas', ['/relatorios', '/produtos']],
  ['/almoxarifado', ['/almoxarifado', '/produtos']],
];

/** Dado o path de uma mutação, invalida os caches relacionados */
export function invalidateByMutation(mutationUrl: string): void {
  for (const [pattern, targets] of INVALIDATION_MAP) {
    if (mutationUrl.includes(pattern)) {
      cacheInvalidate(...targets);
      return;
    }
  }
  // Fallback: invalida tudo quando não reconhece
  cacheClear();
}
