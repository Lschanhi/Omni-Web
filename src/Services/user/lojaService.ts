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

export type LojaPedidoStatusPedidoApi =
  | "Pendente"
  | "Pago"
  | "Enviado"
  | "Entregue"
  | "Cancelado";

export type LojaPedidoStatusVendaApi =
  | "Criada"
  | "Paga"
  | "Enviada"
  | "Concluida"
  | "Cancelada";

export type LojaPedidoItemLeituraApiResponse = {
  id: number;
  produtoId: number;
  nomeProduto: string;
  quantidade: number;
  precoUnitario: number;
  valorTotal: number;
};

export type LojaPedidoLeituraApiResponse = {
  pedidoId: number;
  vendaId?: number | null;
  lojaId: number;
  nomeLoja: string;
  clienteId: number;
  nomeCliente: string;
  emailCliente: string;
  statusPedido: LojaPedidoStatusPedidoApi;
  statusVenda?: LojaPedidoStatusVendaApi | null;
  tipoEntrega: string;
  valorTotalPedido: number;
  valorTotalLoja: number;
  quantidadeItens: number;
  dataPedido: string;
  observacao: string;
  tipoLogradouroEntrega: string;
  nomeEnderecoEntrega: string;
  numeroEntrega: string;
  complementoEntrega?: string | null;
  cepEntrega: string;
  cidadeEntrega: string;
  ufEntrega: string;
  pedidoMultiloja: boolean;
  podeCancelar: boolean;
  podeMarcarComoEnviado: boolean;
  itens: LojaPedidoItemLeituraApiResponse[];
};

export type LojaPedidoListagemApiResponse = {
  items: LojaPedidoLeituraApiResponse[];
  total: number;
  page: number;
  pageSize: number;
};

export type LojaPedidosListagemParams = {
  busca?: string;
  statusPedido?: LojaPedidoStatusPedidoApi;
  statusVenda?: LojaPedidoStatusVendaApi;
  page?: number;
  pageSize?: number;
};

export type LojaAtualizarStatusPedidoPayload = {
  statusVenda: Extract<LojaPedidoStatusVendaApi, "Enviada" | "Cancelada">;
};

export type LojaAtualizarStatusPedidoResponse = {
  mensagem: string;
  pedido: LojaPedidoLeituraApiResponse;
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

export async function listarPedidosDaMinhaLoja(params: LojaPedidosListagemParams = {}) {
  const query = new URLSearchParams();

  if (params.busca?.trim()) {
    query.set("busca", params.busca.trim());
  }

  if (params.statusPedido) {
    query.set("statusPedido", params.statusPedido);
  }

  if (params.statusVenda) {
    query.set("statusVenda", params.statusVenda);
  }

  if (params.page) {
    query.set("page", String(params.page));
  }

  if (params.pageSize) {
    query.set("pageSize", String(params.pageSize));
  }

  const path = query.size > 0 ? `/api/lojas/minha/pedidos?${query.toString()}` : "/api/lojas/minha/pedidos";

  return apiRequest<LojaPedidoListagemApiResponse>(path, {
    authenticated: true,
  });
}

export async function listarTodosPedidosDaMinhaLoja(
  params: Omit<LojaPedidosListagemParams, "page"> = {},
) {
  const pageSize = params.pageSize ?? 100;
  let page = 1;
  let totalColetado = 0;
  const pedidos: LojaPedidoLeituraApiResponse[] = [];

  while (true) {
    const resposta = await listarPedidosDaMinhaLoja({
      ...params,
      page,
      pageSize,
    });

    pedidos.push(...resposta.items);
    totalColetado += resposta.items.length;

    if (resposta.items.length === 0 || totalColetado >= resposta.total) {
      return pedidos;
    }

    page += 1;
  }
}

export async function buscarPedidoDaMinhaLoja(pedidoId: number) {
  return apiRequest<LojaPedidoLeituraApiResponse>(`/api/lojas/minha/pedidos/${pedidoId}`, {
    authenticated: true,
  });
}

export async function atualizarStatusPedidoDaMinhaLoja(
  pedidoId: number,
  payload: LojaAtualizarStatusPedidoPayload,
) {
  return apiRequest<LojaAtualizarStatusPedidoResponse>(
    `/api/lojas/minha/pedidos/${pedidoId}/status`,
    {
      method: "PUT",
      authenticated: true,
      body: payload,
    },
  );
}
