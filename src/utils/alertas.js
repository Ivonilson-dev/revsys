/**
 * Utilitário de Cálculo de Alertas de Manutenção
 */

/**
 * Calcula o status de manutenção para um registro de troca com base no KM atual do veículo e na data atual.
 * 
 * Regras:
 * - Vencido (Vermelho): KM atual do veículo >= KM previsto OU data atual >= data prevista.
 * - Próximo (Amarelo): KM previsto - KM atual <= 1000 KM OU data prevista - data atual <= 15 dias.
 * - Em Dia (Verde): Qualquer outra situação.
 * 
 * @param {object} troca - Registro da última troca de uma determinada peça
 * @param {number} kmAtualVeiculo - KM atual do veículo
 * @returns {object} - { status: 'vencido'|'proximo'|'normal', mensagem: string, cor: string }
 */
function calcularStatusAlerta(troca, kmAtualVeiculo) {
  if (!troca) {
    return { status: 'normal', mensagem: 'Sem histórico', cor: 'text-gray-500' };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const { km_previsto_proximo, data_prevista_proximo } = troca;

  let vencidoPorKm = false;
  let vencidoPorData = false;
  let proximoPorKm = false;
  let proximoPorData = false;

  // 1. Validar por KM
  if (km_previsto_proximo !== null && km_previsto_proximo !== undefined) {
    if (kmAtualVeiculo >= km_previsto_proximo) {
      vencidoPorKm = true;
    } else if (km_previsto_proximo - kmAtualVeiculo <= 1000) {
      proximoPorKm = true;
    }
  }

  // 2. Validar por Data
  if (data_prevista_proximo) {
    const dataPrevista = new Date(data_prevista_proximo);
    dataPrevista.setHours(0, 0, 0, 0);

    const diffTempo = dataPrevista.getTime() - hoje.getTime();
    const diffDias = Math.ceil(diffTempo / (1000 * 60 * 60 * 24));

    if (diffDias <= 0) {
      vencidoPorData = true;
    } else if (diffDias <= 15) {
      proximoPorData = true;
    }
  }

  // Se passou de data ou KM (considera o que chegar primeiro - RF-16/RF-34)
  if (vencidoPorKm || vencidoPorData) {
    let msg = 'Troca vencida';
    if (vencidoPorKm && vencidoPorData) {
      msg = 'Vencido por KM e tempo';
    } else if (vencidoPorKm) {
      msg = 'Vencido por KM';
    } else {
      msg = 'Vencido por tempo';
    }
    return { status: 'vencido', mensagem: msg, cor: 'bg-red-100 text-red-800 border-red-200' };
  }

  // Se está próximo por data ou KM
  if (proximoPorKm || proximoPorData) {
    let msg = 'Próximo do vencimento';
    if (proximoPorKm && proximoPorData) {
      msg = 'Próximo por KM e tempo';
    } else if (proximoPorKm) {
      msg = 'Próximo por KM';
    } else {
      msg = 'Próximo por tempo';
    }
    return { status: 'proximo', mensagem: msg, cor: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
  }

  return { status: 'normal', mensagem: 'Manutenção em dia', cor: 'bg-green-100 text-green-800 border-green-200' };
}

module.exports = {
  calcularStatusAlerta
};
