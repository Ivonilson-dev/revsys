import { Request, Response } from 'express';
import { sequelize, RegistroTroca, Veiculo } from '../../models';
import { tratarErroRequisicao } from '../utils/erros';

export interface IRegistroTrocaDTO {
  veiculo_id?: string | number;
  peca_id?: string | number;
  oficina_id?: string | number | null;
  nome_oficina_manual?: string | null;
  km_na_troca?: string | number;
  data_troca?: string;
  km_previsto_proximo?: string | number | null;
  data_prevista_proximo?: string | null;
  executado_por?: string;
  observacoes?: string | null;
  atualizar_km_veiculo?: string | boolean;
}

function responderErroTroca(req: Request, res: Response, veiculoId: number | string | undefined, mensagem: string): void {
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    res.status(400).json({ erro: mensagem });
    return;
  }
  const urlDestino = veiculoId ? `/veiculos/${veiculoId}?erro=${encodeURIComponent(mensagem)}` : `/veiculos?erro=${encodeURIComponent(mensagem)}`;
  res.redirect(urlDestino);
}

export class TrocaController {
  /**
   * POST /troca
   * Registra uma troca de peça associada a um veículo
   */
  public static async registrar(req: Request<{}, {}, IRegistroTrocaDTO>, res: Response): Promise<void> {
    const {
      veiculo_id,
      peca_id,
      oficina_id,
      nome_oficina_manual,
      km_na_troca,
      data_troca,
      km_previsto_proximo,
      data_prevista_proximo,
      executado_por,
      observacoes
    } = req.body;

    if (!veiculo_id || !peca_id || km_na_troca === undefined || km_na_troca === null || !executado_por) {
      responderErroTroca(req, res, veiculo_id, 'Campos obrigatórios ausentes: informe a peça, a quilometragem e quem executou a troca.');
      return;
    }

    const kmTrocaInt = parseInt(String(km_na_troca), 10);
    if (isNaN(kmTrocaInt) || kmTrocaInt < 0) {
      responderErroTroca(req, res, veiculo_id, 'A quilometragem na troca não pode ser negativa.');
      return;
    }

    const hojeStr = new Date().toLocaleDateString('en-CA');
    const dataTrocaInformada = data_troca || hojeStr;
    if (dataTrocaInformada > hojeStr) {
      responderErroTroca(req, res, veiculo_id, 'A data da troca não pode ser futura, pois refere-se a um serviço já executado.');
      return;
    }

    if (km_previsto_proximo) {
      const kmProxInt = parseInt(String(km_previsto_proximo), 10);
      if (kmProxInt <= kmTrocaInt) {
        responderErroTroca(req, res, veiculo_id, 'A quilometragem prevista para a próxima troca deve ser maior que a quilometragem atual.');
        return;
      }
    }

    if (data_prevista_proximo && data_prevista_proximo <= dataTrocaInformada) {
      responderErroTroca(req, res, veiculo_id, 'A data prevista para a próxima troca deve ser posterior à data da troca.');
      return;
    }

    const t = await sequelize.transaction();

    try {
      const veiculo = await Veiculo.findByPk(Number(veiculo_id), { transaction: t });
      if (!veiculo) {
        await t.rollback();
        responderErroTroca(req, res, undefined, 'Veículo não encontrado.');
        return;
      }

      if (dataTrocaInformada === hojeStr && kmTrocaInt < veiculo.km_atual) {
        await t.rollback();
        responderErroTroca(
          req, 
          res, 
          veiculo_id, 
          `A quilometragem na troca (${kmTrocaInt.toLocaleString('pt-BR')} km) não pode ser inferior à quilometragem atual do veículo (${veiculo.km_atual.toLocaleString('pt-BR')} km).`
        );
        return;
      }

      // Preparar dados da oficina
      let idOficina: number | null = oficina_id ? parseInt(String(oficina_id), 10) : null;
      let nomeManual: string | null = nome_oficina_manual || null;

      if (idOficina) {
        nomeManual = null; // Se selecionou oficina cadastrada, anula o nome manual
      }

      // Criar registro de troca
      await RegistroTroca.create({
        veiculo_id: Number(veiculo_id),
        peca_id: Number(peca_id),
        oficina_id: idOficina,
        nome_oficina_manual: nomeManual,
        km_na_troca: kmTrocaInt,
        data_troca: data_troca || hojeStr,
        km_previsto_proximo: km_previsto_proximo ? parseInt(String(km_previsto_proximo), 10) : null,
        data_prevista_proximo: data_prevista_proximo || null,
        executado_por,
        observacoes: observacoes || null
      }, { transaction: t });

      // Regra de Negócio RF-33: Atualizar KM do veículo (apenas se for maior, impedindo regressão)
      if (kmTrocaInt > veiculo.km_atual) {
        await veiculo.update({
          km_atual: kmTrocaInt
        }, { transaction: t });
      }

      await t.commit();
      
      res.redirect(`/veiculos/${veiculo_id}?sucesso=Troca de peça registrada com sucesso!`);

    } catch (error) {
      await t.rollback();
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * DELETE /troca/:id
   * Exclui um registro de troca
   */
  public static async deletar(req: Request<{ id: string }>, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const troca = await RegistroTroca.findByPk(Number(id));
      if (!troca) {
        responderErroTroca(req, res, undefined, 'Registro de troca não encontrado.');
        return;
      }

      const veiculoId = troca.veiculo_id;
      await troca.destroy();

      res.redirect(`/veiculos/${veiculoId}?sucesso=Registro de troca removido com sucesso!`);
    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }
}

export default TrocaController;

// Compatibilidade CommonJS
module.exports = TrocaController;
