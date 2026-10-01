import NodeCache from 'node-cache';

// TTL padrão de 1 hora (3600 segundos)
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 120, useClones: false });

export interface ICacheKeys {
  MARCAS_VEICULO: string;
  MODELOS_VEICULO: string;
  MARCAS_PECA: string;
  PECAS: string;
  OFICINAS: string;
  SERVICOS: string;
}

export const CacheKeys: ICacheKeys = {
  MARCAS_VEICULO: 'marcas_veiculo_list',
  MODELOS_VEICULO: 'modelos_veiculo_list',
  MARCAS_PECA: 'marcas_peca_list',
  PECAS: 'pecas_list',
  OFICINAS: 'oficinas_list',
  SERVICOS: 'servicos_list'
};

export class AppCache {
  public static get<T>(key: string): T | undefined {
    return cache.get<T>(key);
  }

  public static set<T>(key: string, value: T, ttl?: number | string): boolean {
    if (ttl !== undefined) {
      return cache.set(key, value, ttl);
    }
    return cache.set(key, value);
  }

  public static del(key: string | string[]): number {
    return cache.del(key);
  }

  public static flush(): void {
    cache.flushAll();
  }

  public static readonly keys = CacheKeys;
}

export default AppCache;

// Compatibilidade CommonJS
module.exports = {
  get: AppCache.get.bind(AppCache),
  set: AppCache.set.bind(AppCache),
  del: AppCache.del.bind(AppCache),
  flush: AppCache.flush.bind(AppCache),
  keys: CacheKeys,
  AppCache
};
