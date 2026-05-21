import { apiRequest } from "../http/apiClient";

type LojaEntregaOpcaoApiResponse = {
  id: number;
  lojaId: number;
  tipoEntrega: string;
  nome: string;
  valorFrete: number;
  prazoEntregaDias: number;
  observacao?: string | null;
  ativa: boolean;
  resumoCobertura: string;
  dataCriacao: string;
  dataAtualizacao?: string | null;
};

export type LojaEntregaFiltro = {
  cep?: string;
  cidade?: string;
  uf?: string;
};

export type LojaEntregaOpcao = LojaEntregaOpcaoApiResponse & {
  tipoEntregaId: number | null;
};

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function resolverTipoEntregaId(tipoEntrega: string) {
  switch (normalizarTexto(tipoEntrega)) {
    case "retirada":
      return 1;
    case "entrega local":
      return 2;
    case "correios":
      return 3;
    case "motoboy":
      return 4;
    default:
      return null;
  }
}

export async function listarEntregasPublicasLoja(lojaId: number, filtro?: LojaEntregaFiltro) {
  const params = new URLSearchParams();

  if (filtro?.cep?.trim()) {
    params.set("cep", filtro.cep.trim());
  }

  if (filtro?.cidade?.trim()) {
    params.set("cidade", filtro.cidade.trim());
  }

  if (filtro?.uf?.trim()) {
    params.set("uf", filtro.uf.trim().toUpperCase());
  }

  const query = params.toString();
  const rota = query
    ? `/api/lojas/${lojaId}/entregas?${query}`
    : `/api/lojas/${lojaId}/entregas`;

  const opcoes = await apiRequest<LojaEntregaOpcaoApiResponse[]>(rota);

  return opcoes.map((opcao) => ({
    ...opcao,
    valorFrete: Number(opcao.valorFrete ?? 0),
    prazoEntregaDias: Number(opcao.prazoEntregaDias ?? 0),
    tipoEntregaId: resolverTipoEntregaId(opcao.tipoEntrega),
  }));
}
