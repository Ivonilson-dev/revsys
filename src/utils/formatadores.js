/**
 * Utilitários para formatação e máscaras de exibição no frontend/backend
 * Padrão brasileiro: CPF, CNPJ, Telefone Fixo/Celular, CEP e Placa
 */

function formatarCPF(valor) {
  if (!valor) return '';
  const d = String(valor).replace(/\D/g, '');
  if (d.length === 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return valor;
}

function formatarCNPJ(valor) {
  if (!valor) return '';
  const d = String(valor).replace(/\D/g, '');
  if (d.length === 14) {
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return valor;
}

function formatarCPFCNPJ(valor) {
  if (!valor) return '';
  const d = String(valor).replace(/\D/g, '');
  if (d.length <= 11) {
    return formatarCPF(valor);
  }
  return formatarCNPJ(valor);
}

function formatarTelefone(valor) {
  if (!valor) return '';
  let d = String(valor).replace(/\D/g, '');
  
  // Se começar com DDI 55 do Brasil e tiver 12 ou 13 dígitos, formata em nível nacional
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) {
    d = d.slice(2);
  }

  if (d.length === 11) {
    // Celular com DDD: (11) 99999-9999
    return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (d.length === 10) {
    // Fixo com DDD: (11) 3333-3333
    return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (d.length === 9) {
    // Celular sem DDD: 99999-9999
    return d.replace(/(\d{5})(\d{4})/, '$1-$2');
  } else if (d.length === 8) {
    // Fixo sem DDD: 3333-3333
    return d.replace(/(\d{4})(\d{4})/, '$1-$2');
  }

  return valor;
}

function formatarCEP(valor) {
  if (!valor) return '';
  const d = String(valor).replace(/\D/g, '');
  if (d.length === 8) {
    return d.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
  return valor;
}

function formatarPlaca(valor) {
  if (!valor) return '';
  const limpo = String(valor).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (limpo.length === 7) {
    if (/^[A-Z]{3}[0-9]{4}$/.test(limpo)) {
      return limpo.replace(/([A-Z]{3})([0-9]{4})/, '$1-$2');
    }
    return limpo;
  }
  return valor;
}

function ehPlacaMercosul(valor) {
  if (!valor) return false;
  const limpo = String(valor).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(limpo);
}

function ehPlacaAntiga(valor) {
  if (!valor) return false;
  const limpo = String(valor).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z]{3}[0-9]{4}$/.test(limpo);
}

function obterTipoPlaca(valor) {
  if (ehPlacaMercosul(valor)) return 'mercosul';
  if (ehPlacaAntiga(valor)) return 'antiga';
  return 'outro';
}

function obterClassePlaca(valor) {
  return ehPlacaMercosul(valor) ? 'placa-mercosul' : 'placa-antiga';
}

function formatarData(valor) {
  if (!valor) return '-';
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valor)) {
    const partes = valor.split('T')[0].split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  const d = new Date(valor);
  if (isNaN(d.getTime())) return valor;
  return d.toLocaleDateString('pt-BR');
}

function formatarKm(valor) {
  if (valor === null || valor === undefined || valor === '') return '-';
  const num = Number(valor);
  if (isNaN(num)) return valor;
  return num.toLocaleString('pt-BR') + ' km';
}

function formatarDuracao(minutos) {
  if (!minutos) return '';
  const num = Number(minutos);
  if (isNaN(num) || num <= 0) return '';
  const h = Math.floor(num / 60);
  const m = num % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

module.exports = {
  formatarCPF,
  formatarCNPJ,
  formatarCPFCNPJ,
  formatarTelefone,
  formatarCEP,
  formatarPlaca,
  ehPlacaMercosul,
  ehPlacaAntiga,
  obterTipoPlaca,
  obterClassePlaca,
  formatarData,
  formatarKm,
  formatarDuracao
};
