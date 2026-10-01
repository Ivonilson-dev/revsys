import 'express-session';

declare module 'express-session' {
  interface SessionData {
    usuario?: {
      id: number;
      nome: string;
      email: string;
      papel: 'admin' | 'gerente' | 'atendente' | 'mecanico' | 'cliente';
      clienteId?: number;
    } | null;
    redirecionarPara?: string;
    [key: string]: unknown;
  }
}

declare global {
  namespace Express {
    interface Locals {
      usuarioLogado?: {
        id: number;
        nome: string;
        email: string;
        papel: 'admin' | 'gerente' | 'atendente' | 'mecanico' | 'cliente';
        clienteId?: number;
      } | null;
      urlAtiva?: string;
      sucessoMsg?: string | null;
      erroMsg?: string | null;
      [key: string]: unknown;
    }
  }
}
