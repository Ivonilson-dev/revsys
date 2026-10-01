import { Request, Response } from 'express';
import { sequelize, RegistroServico, Veiculo } from '../../models';
import { tratarErroRequisicao } from '../utils/erros';

export interface IRegistroServicoDTO {
  veiculo_id?: string | number;
  servico_id?: string | number;
  oficina_id?: string | number | null;
  nome_oficina_manual?: string | null;
  km_no_servico?: string | number;
  data_servico?: string;
  km_previsto_proximo?: string | number | null;
  data_prevista_proximo?: string | null;
  executado_por?: string;
  observacoes?: string | null;
  atualizar_km_veiculo?: string | boolean;
}

function responderErroServico(req: Request, res: Response, veiculoId: number | string | undefined, mensagem: string): void {
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    res.status(400).json({ erro: mensagem });
    return;
  }
  const urlDestino = veiculoId ? `/veiculos/${veiculoId}?erro=${encodeURIComponent(mensagem)}` : `/veiculos?erro=${encodeURIComponent(mensagem)}`;
  res.redirect(urlDestino);
}

export class ServicoController {
  /**
   * POST /registro-servico
   * Registra um serviço/revisão executado em um veículo
   */
  public static async registrar(req: Request<{}, {}, IRegistroServicoDTO>, res: Response): Promise<void> {
    const {
      veiculo_id,
      servico_id,
      oficina_id,
      nome_oficina_manual,
      km_no_servico,
      data_servico,
      km_previsto_proximo,
      data_prevista_proximo,
      executado_por,
      observacoes
    } = req.body;

    if (!veiculo_id || !servico_id || km_no_servico === undefined || km_no_servico === null || !executado_por) {
      responderErroServico(req, res, veiculo_id, 'Campos obrigatórios ausentes: preencha o serviço, a quilometragem e o executor.');
      return;
    }

    const kmServicoInt = parseInt(String(km_no_servico), 10);
    if (isNaN(kmServicoInt) || kmServicoInt < 0) {
      responderErroServico(req, res, veiculo_id, 'A quilometragem no serviço não pode ser negativa.');
      return;
    }

    const hojeStr = new Date().toLocaleDateString('en-CA');
    const dataServicoInformada = data_servico || hojeStr;
    if (dataServicoInformada > hojeStr) {
      responderErroServico(req, res, veiculo_id, 'A data do serviço não pode ser futura, pois refere-se a um serviço já executado.');
      return;
    }

    if (km_previsto_proximo) {
      const kmProxInt = parseInt(String(km_previsto_proximo), 10);
      if (kmProxInt <= kmServicoInt) {
        responderErroServico(req, res, veiculo_id, 'A quilometragem prevista para a próxima revisão deve ser maior que a quilometragem atual.');
        return;
      }
    }

    if (data_prevista_proximo && data_prevista_proximo <= dataServicoInformada) {
      responderErroServico(req, res, veiculo_id, 'A data prevista para a próxima revisão deve ser posterior à data do serviço.');
      return;
    }

    const t = await sequelize.transaction();

    try {
      const veiculo = await Veiculo.findByPk(Number(veiculo_id), { transaction: t });
      if (!veiculo) {
        await t.rollback();
        responderErroServico(req, res, undefined, 'Veículo não encontrado.');
        return;
      }

      if (dataServicoInformada === hojeStr && kmServicoInt < veiculo.km_atual) {
        await t.rollback();
        responderErroServico(
          req, 
          res, 
          veiculo_id, 
          `A quilometragem no serviço (${kmServicoInt.toLocaleString('pt-BR')} km) não pode ser inferior à quilometragem atual do veículo (${veiculo.km_atual.toLocaleString('pt-BR')} km).`
        );
        return;
      }

      let idOficina: number | null = oficina_id ? parseInt(String(oficina_id), 10) : null;
      let nomeManual: string | null = nome_oficina_manual || null;

      if (idOficina) {
        nomeManual = null;
      }

      await RegistroServico.create({
        veiculo_id: Number(veiculo_id),
        servico_id: Number(servico_id),
        oficina_id: idOficina,
        nome_oficina_manual: nomeManual,
        km_no_servico: kmServicoInt,
        data_servico: data_servico || hojeStr,
        km_previsto_proximo: km_previsto_proximo ? parseInt(String(km_previsto_proximo), 10) : null,
        data_prevista_proximo: data_prevista_proximo || null,
        executado_por,
        observacoes: observacoes || null
      }, { transaction: t });

      // Regra de Negócio RF-33: Atualizar KM do veículo (apenas se for maior, impedindo regressão)
      if (kmServicoInt > veiculo.km_atual) {
        await veiculo.update({
          km_atual: kmServicoInt
        }, { transaction: t });
      }

      await t.commit();
      
      res.redirect(`/veiculos/${veiculo_id}?sucesso=Registro de serviço realizado com sucesso!`);

    } catch (error) {
      await t.rollback();
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * DELETE /registro-servico/:id
   * Exclui um registro de serviço
   */
  public static async deletar(req: Request<{ id: string }>, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const reg = await RegistroServico.findByPk(Number(id));
      if (!reg) {
        responderErroServico(req, res, undefined, 'Registro de serviço não encontrado.');
        return;
      }

      const veiculoId = reg.veiculo_id;
      await reg.destroy();

      res.redirect(`/veiculos/${veiculoId}?sucesso=Registro de serviço removido com sucesso!`);
    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }
}

export default ServicoController;

// Compatibilidade CommonJS
module.exports = ServicoController;
