import { apiRequest } from "../http/apiClient";
import type { PedidoLeituraApiResponse } from "../user/usuarioService";

export type CriarPedidoPayload = {
  enderecoId?: number;
  tipoEntregaId: number;
  observacao: string;
  itens: Array<{
    produtoId: number;
    quantidade: number;
  }>;
};

export type CriarPedidoResponse = {
  mensagem: string;
  pedidoId: number;
  valorProdutos: number;
  valorFrete: number;
  valorTotal: number;
  status: string;
};

export async function criarPedido(payload: CriarPedidoPayload) {
  return apiRequest<CriarPedidoResponse>("/api/pedidos", {
    method: "POST",
    authenticated: true,
    body: payload,
  });
}

export async function buscarPedido(id: number) {
  return apiRequest<PedidoLeituraApiResponse>(`/api/pedidos/${id}`, {
    authenticated: true,
  });
}
