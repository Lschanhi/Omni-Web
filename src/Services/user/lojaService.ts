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
  | "Pendente"
  | "Paga"
  | "EmSeparacao"
  | "Pronto"
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
  podeAceitar: boolean;
  podeCancelar: boolean;
  podeMarcarComoPronto: boolean;
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

export type LojaAtualizarStatusVendaPermitido = Extract<
  LojaPedidoStatusVendaApi,
  "EmSeparacao" | "Pronto" | "Enviada" | "Cancelada"
>;

export type LojaAtualizarStatusPedidoPayload = {
  statusVenda: LojaAtualizarStatusVendaPermitido;
};

export type LojaAtualizarStatusPedidoResponse = {
  mensagem: string;
  pedido: LojaPedidoLeituraApiResponse;
};

function lerObjeto(valor: unknown) {
  return valor && typeof valor === "object" ? (valor as Record<string, unknown>) : null;
}

function lerTexto(valor: unknown, fallback = "") {
  return typeof valor === "string" ? valor : fallback;
}

function lerNumero(valor: unknown, fallback = 0) {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : fallback;
}

function lerBoolean(valor: unknown, fallback = false) {
  return typeof valor === "boolean" ? valor : fallback;
}

function normalizarTextoChave(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_-]+/g, "")
    .toLowerCase();
}

function normalizarStatusPedido(valor: unknown): LojaPedidoStatusPedidoApi {
  if (typeof valor === "number") {
    switch (valor) {
      case 2:
        return "Pago";
      case 3:
        return "Enviado";
      case 4:
        return "Entregue";
      case 5:
        return "Cancelado";
      case 1:
      default:
        return "Pendente";
    }
  }

  switch (valor) {
    case "Pago":
      return "Pago";
    case "Enviado":
      return "Enviado";
    case "Entregue":
      return "Entregue";
    case "Cancelado":
      return "Cancelado";
    case "Pendente":
    default:
      return "Pendente";
  }
}

function normalizarStatusVenda(valor: unknown): LojaPedidoStatusVendaApi | null {
  if (valor == null) {
    return null;
  }

  if (typeof valor === "number") {
    switch (valor) {
      case 7:
        return "Cancelada";
      case 6:
        return "Concluida";
      case 5:
        return "Enviada";
      case 4:
        return "Pronto";
      case 3:
        return "EmSeparacao";
      case 2:
        return "Pendente";
      case 1:
        return "Criada";
      default:
        return null;
    }
  }

  if (typeof valor !== "string") {
    return null;
  }

  switch (normalizarTextoChave(valor)) {
    case "criada":
      return "Criada";
    case "pendente":
    case "paga":
    case "pago":
    case "aprovada":
    case "aprovado":
      return "Pendente";
    case "emseparacao":
    case "separacao":
    case "separando":
    case "processando":
    case "empreparacao":
      return "EmSeparacao";
    case "pronto":
    case "pronta":
    case "prontoparaenvio":
    case "prontopararetirada":
    case "embalado":
      return "Pronto";
    case "enviada":
    case "enviado":
    case "emtransito":
    case "saiuparaentrega":
    case "despachado":
      return "Enviada";
    case "concluida":
    case "concluido":
    case "entregue":
    case "recebido":
    case "retirado":
      return "Concluida";
    case "cancelada":
    case "cancelado":
      return "Cancelada";
    default:
      return null;
  }
}

function normalizarItemPedidoLoja(valor: unknown): LojaPedidoItemLeituraApiResponse | null {
  const item = lerObjeto(valor);

  if (!item) {
    return null;
  }

  const produtoId = lerNumero(item.produtoId ?? item.ProdutoId, 0);
  const id = lerNumero(item.id ?? item.Id, 0);

  if (!id || !produtoId) {
    return null;
  }

  return {
    id,
    produtoId,
    nomeProduto: lerTexto(item.nomeProduto ?? item.NomeProduto, "Produto"),
    quantidade: lerNumero(item.quantidade ?? item.Quantidade, 0),
    precoUnitario: lerNumero(item.precoUnitario ?? item.PrecoUnitario, 0),
    valorTotal: lerNumero(item.valorTotal ?? item.ValorTotal, 0),
  };
}

function normalizarPedidoLoja(valor: unknown): LojaPedidoLeituraApiResponse | null {
  const pedido = lerObjeto(valor);

  if (!pedido) {
    return null;
  }

  const pedidoId = lerNumero(pedido.pedidoId ?? pedido.PedidoId, 0);
  const lojaId = lerNumero(pedido.lojaId ?? pedido.LojaId, 0);

  if (!pedidoId || !lojaId) {
    return null;
  }

  const itensBrutos = pedido.itens ?? pedido.Itens;
  const itens = Array.isArray(itensBrutos)
    ? itensBrutos.map(normalizarItemPedidoLoja).filter((item): item is LojaPedidoItemLeituraApiResponse => Boolean(item))
    : [];

  return {
    pedidoId,
    vendaId: lerNumero(pedido.vendaId ?? pedido.VendaId, 0) || null,
    lojaId,
    nomeLoja: lerTexto(pedido.nomeLoja ?? pedido.NomeLoja),
    clienteId: lerNumero(pedido.clienteId ?? pedido.ClienteId, 0),
    nomeCliente: lerTexto(pedido.nomeCliente ?? pedido.NomeCliente),
    emailCliente: lerTexto(pedido.emailCliente ?? pedido.EmailCliente),
    statusPedido: normalizarStatusPedido(pedido.statusPedido ?? pedido.StatusPedido),
    statusVenda: normalizarStatusVenda(pedido.statusVenda ?? pedido.StatusVenda),
    tipoEntrega: lerTexto(pedido.tipoEntrega ?? pedido.TipoEntrega),
    valorTotalPedido: lerNumero(pedido.valorTotalPedido ?? pedido.ValorTotalPedido, 0),
    valorTotalLoja: lerNumero(pedido.valorTotalLoja ?? pedido.ValorTotalLoja, 0),
    quantidadeItens: lerNumero(pedido.quantidadeItens ?? pedido.QuantidadeItens, itens.length),
    dataPedido: lerTexto(pedido.dataPedido ?? pedido.DataPedido),
    observacao: lerTexto(pedido.observacao ?? pedido.Observacao),
    tipoLogradouroEntrega: lerTexto(pedido.tipoLogradouroEntrega ?? pedido.TipoLogradouroEntrega),
    nomeEnderecoEntrega: lerTexto(pedido.nomeEnderecoEntrega ?? pedido.NomeEnderecoEntrega),
    numeroEntrega: lerTexto(pedido.numeroEntrega ?? pedido.NumeroEntrega),
    complementoEntrega: lerTexto(
      pedido.complementoEntrega ?? pedido.ComplementoEntrega,
      "",
    ) || null,
    cepEntrega: lerTexto(pedido.cepEntrega ?? pedido.CepEntrega),
    cidadeEntrega: lerTexto(pedido.cidadeEntrega ?? pedido.CidadeEntrega),
    ufEntrega: lerTexto(pedido.ufEntrega ?? pedido.UfEntrega),
    pedidoMultiloja: lerBoolean(pedido.pedidoMultiloja ?? pedido.PedidoMultiloja, false),
    podeAceitar: lerBoolean(pedido.podeAceitar ?? pedido.PodeAceitar, false),
    podeCancelar: lerBoolean(pedido.podeCancelar ?? pedido.PodeCancelar, false),
    podeMarcarComoPronto: lerBoolean(
      pedido.podeMarcarComoPronto ?? pedido.PodeMarcarComoPronto,
      false,
    ),
    podeMarcarComoEnviado: lerBoolean(
      pedido.podeMarcarComoEnviado ?? pedido.PodeMarcarComoEnviado,
      false,
    ),
    itens,
  };
}

function normalizarRespostaListaPedidosLoja(valor: unknown): LojaPedidoListagemApiResponse {
  if (Array.isArray(valor)) {
    const items = valor
      .map(normalizarPedidoLoja)
      .filter((pedido): pedido is LojaPedidoLeituraApiResponse => Boolean(pedido));

    return {
      items,
      total: items.length,
      page: 1,
      pageSize: items.length,
    };
  }

  const resposta = lerObjeto(valor);

  if (!resposta) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: 0,
    };
  }

  const itemsBrutos = resposta.items ?? resposta.Items;
  const items = Array.isArray(itemsBrutos)
    ? itemsBrutos
        .map(normalizarPedidoLoja)
        .filter((pedido): pedido is LojaPedidoLeituraApiResponse => Boolean(pedido))
    : [];

  return {
    items,
    total: lerNumero(resposta.total ?? resposta.Total, items.length),
    page: lerNumero(resposta.page ?? resposta.Page, 1),
    pageSize: lerNumero(resposta.pageSize ?? resposta.PageSize, items.length),
  };
}

function normalizarRespostaAtualizacaoPedidoLoja(valor: unknown): LojaAtualizarStatusPedidoResponse {
  const resposta = lerObjeto(valor);
  const pedido = normalizarPedidoLoja(
    resposta?.pedido ?? resposta?.Pedido ?? resposta?.data ?? resposta?.Data,
  );

  if (!pedido) {
    throw new Error("A API retornou uma resposta invalida ao atualizar o status da venda.");
  }

  return {
    mensagem: lerTexto(
      resposta?.mensagem ?? resposta?.Mensagem,
      "Status da venda atualizado com sucesso.",
    ),
    pedido,
  };
}

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

  const resposta = await apiRequest<unknown>(path, {
    authenticated: true,
  });

  return normalizarRespostaListaPedidosLoja(resposta);
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
  const resposta = await apiRequest<unknown>(`/api/lojas/minha/pedidos/${pedidoId}`, {
    authenticated: true,
  });

  const pedido = normalizarPedidoLoja(resposta);

  if (!pedido) {
    throw new Error("A API retornou um pedido invalido para a loja.");
  }

  return pedido;
}

export async function atualizarStatusPedidoDaMinhaLoja(
  pedidoId: number,
  payload: LojaAtualizarStatusPedidoPayload,
) {
  const resposta = await apiRequest<unknown>(
    `/api/lojas/minha/pedidos/${pedidoId}/status`,
    {
      method: "PUT",
      authenticated: true,
      body: payload,
    },
  );

  return normalizarRespostaAtualizacaoPedidoLoja(resposta);
}
