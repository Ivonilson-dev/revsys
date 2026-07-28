const NodeCache = require('node-cache');

// TTL padrão de 1 hora (3600 segundos)
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 120, useClones: false });

module.exports = {
  get: (key) => cache.get(key),
  set: (key, value, ttl) => cache.set(key, value, ttl),
  del: (key) => cache.del(key),
  flush: () => cache.flushAll(),
  keys: {
    MARCAS_VEICULO: 'marcas_veiculo_list',
    MODELOS_VEICULO: 'modelos_veiculo_list',
    MARCAS_PECA: 'marcas_peca_list',
    PECAS: 'pecas_list',
    OFICINAS: 'oficinas_list',
    SERVICOS: 'servicos_list'
  }
};
