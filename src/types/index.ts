export type PapelUsuario = 'admin' | 'gerente' | 'atendente' | 'mecanico' | 'cliente';

export type StatusAgendamento = 'agendado' | 'concluido' | 'cancelado';

export type ConfirmacaoPresenca = 'pendente' | 'solicitada' | 'confirmada';

export type StatusAlerta = 'vencido' | 'proximo' | 'normal';

export interface IResultadoAlerta {
  status: StatusAlerta;
  mensagem: string;
  cor: string;
}

export interface ITrocaParaAlerta {
  km_previsto_proximo?: number | null;
  data_prevista_proximo?: string | Date | null;
}


export interface IHorarioSlot {
  horario: string;
  horario_fim: string;
  ocupado: boolean;
  motivo_bloqueio?: string;
  conflito_com?: {
    id: number;
    cliente: string;
    placa: string;
    motivo: string;
  };
}

export interface IDuracaoOpcao {
  minutos: number;
  rotulo: string;
}

export interface IUsuarioSessao {
  id: number;
  nome: string;
  email: string;
  papel: PapelUsuario;
  clienteId?: number;
}
