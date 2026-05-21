import { apiRequest } from "../http/apiClient";

export type TipoDocumentoFiscalLoja = 1 | 2;

export type LojaGestaoApiResponse = {
  id: number;
  usuarioId: number;
  nomeFantasia: string;
  slug?: string | null;
  avatarUrl?: string | null;
  logoUrl?: string | null;
  tipoDocumentoFiscal: TipoDocumentoFiscalLoja;
  documentoFiscal: string;
  documentoFiscalFormatado: string;
  descricao?: string | null;
  emailContato?: string | null;
  enderecoId?: number | null;
  cep?: string | null;
  cidade?: string | null;
  uf?: string | null;
  nomeEndereco?: string | null;
  numeroEndereco?: string | null;
  complementoEndereco?: string | null;
  telefoneId?: number | null;
  numeroTelefone?: string | null;
  tipoTelefone?: string | null;
  ativa: boolean;
  mediaAvaliacao: number;
  totalAvaliacoes: number;
  dtCriacao: string;
  dtAtualizacao?: string | null;
};

export type LojaMutacaoPayload = {
  nomeFantasia: string;
  tipoDocumentoFiscal: TipoDocumentoFiscalLoja;
  documentoFiscal: string;
  descricao?: string;
  emailContato?: string;
  usarEnderecoUsuario: boolean;
  enderecoUsuarioId?: number;
  usarTelefoneUsuario: boolean;
  telefoneUsuarioId?: number;
  ativa: boolean;
};

export async function obterMinhaLoja() {
  return apiRequest<LojaGestaoApiResponse>("/api/lojas/minha", {
    authenticated: true,
  });
}

export async function criarMinhaLoja(payload: LojaMutacaoPayload) {
  return apiRequest<LojaGestaoApiResponse>("/api/lojas/minha", {
    method: "POST",
    authenticated: true,
    body: JSON.stringify(payload),
  });
}

export async function atualizarMinhaLoja(payload: LojaMutacaoPayload) {
  return apiRequest<LojaGestaoApiResponse>("/api/lojas/minha", {
    method: "PUT",
    authenticated: true,
    body: JSON.stringify(payload),
  });
}
