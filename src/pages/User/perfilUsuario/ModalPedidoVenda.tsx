import {
  CalendarDays,
  CheckCheck,
  CircleAlert,
  FileText,
  Mail,
  MapPin,
  PackageCheck,
  ShoppingBag,
  Store,
  Truck,
  UserRound,
  XCircle,
} from "lucide-react";
import { Botao } from "../../../Components/Botao";
import { ProfileModal } from "../../../Components/perfil/ProfileModal";
import { ProdutoImagem } from "../../../Components/produto/ProdutoImagem";
import type { PerfilPedidoDetalhe } from "../../../types/perfil";

type ModalPedidoVendaProps = {
  descricao: string;
  isOpen: boolean;
  isCarregandoPedido?: boolean;
  isAtualizandoPedido?: boolean;
  pedido: PerfilPedidoDetalhe | null;
  onAvancarStatus: (pedido: PerfilPedidoDetalhe) => void;
  onCancelarPedido: (pedido: PerfilPedidoDetalhe) => void;
  onClose: () => void;
};

function criarMensagemBloqueioEnvio(pedido: PerfilPedidoDetalhe | null) {
  if (!pedido) {
    return "";
  }

  if (pedido.podeMarcarComoEnviado) {
    return "";
  }

  if (pedido.statusFluxoKey === "pendente") {
    return "A venda ainda nao foi paga. A loja so pode marcar como enviada quando o backend retornar statusVenda = Paga.";
  }

  if (pedido.statusFluxoKey === "cancelado") {
    return "Esta venda ja foi cancelada.";
  }

  if (pedido.statusFluxoKey === "finalizado") {
    return "Esta venda ja foi concluida.";
  }

  if (pedido.statusFluxoKey === "enviado") {
    return "A venda ja foi marcada como enviada e agora aguarda a conclusao do pedido.";
  }

  return "Nao ha mudancas operacionais disponiveis para esta venda no momento.";
}

function criarMensagemBloqueioCancelamento(pedido: PerfilPedidoDetalhe | null) {
  if (!pedido || pedido.podeCancelar) {
    return "";
  }

  if (pedido.pedidoMultiloja) {
    return "Cancelamento indisponivel para pedidos multiloja, porque o backend ainda nao suporta cancelamento parcial por vendedor.";
  }

  if (pedido.statusFluxoKey === "enviado") {
    return "A venda ja foi enviada e nao pode mais ser cancelada pela loja.";
  }

  if (pedido.statusFluxoKey === "finalizado") {
    return "A venda ja foi concluida e nao pode mais ser cancelada pela loja.";
  }

  if (pedido.statusFluxoKey === "cancelado") {
    return "Esta venda ja esta cancelada.";
  }

  return "O backend nao liberou cancelamento para esta venda.";
}

export function ModalPedidoVenda({
  descricao,
  isOpen,
  isCarregandoPedido = false,
  isAtualizandoPedido = false,
  pedido,
  onAvancarStatus,
  onCancelarPedido,
  onClose,
}: ModalPedidoVendaProps) {
  const podeMarcarComoEnviado = Boolean(pedido?.podeMarcarComoEnviado) && !isAtualizandoPedido;
  const podeCancelarPedido = Boolean(pedido?.podeCancelar) && !isAtualizandoPedido;
  const mensagemBloqueioEnvio = criarMensagemBloqueioEnvio(pedido);
  const mensagemBloqueioCancelamento = criarMensagemBloqueioCancelamento(pedido);

  return (
    <ProfileModal
      isOpen={isOpen}
      title={pedido ? `Gerenciar pedido #${pedido.pedidoId}` : "Gerenciar pedido"}
      description={descricao}
      onClose={onClose}
    >
      {pedido ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Status da venda</p>
              <p className="mt-2 text-sm font-semibold text-white">{pedido.status}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Status do pedido</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {pedido.statusPedido ?? pedido.status}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
                <CalendarDays className="h-4 w-4" />
                <span>Data</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-white">{pedido.dataPedido}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Valor da loja</p>
              <p className="mt-2 text-sm font-semibold text-yellow-300">{pedido.total}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-yellow-300" />
                <h3 className="text-sm font-semibold text-white">Cliente</h3>
              </div>

              <div className="mt-4 space-y-3 text-sm text-neutral-300">
                <p className="font-medium text-white">{pedido.nomeCliente ?? "Cliente nao informado"}</p>
                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
                  <p>{pedido.emailCliente ?? "Email nao informado"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-yellow-300" />
                <h3 className="text-sm font-semibold text-white">Entrega</h3>
              </div>

              <div className="mt-4 space-y-3 text-sm text-neutral-300">
                <p>
                  <span className="text-neutral-500">Tipo:</span> {pedido.tipoEntrega}
                </p>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
                  <p>{pedido.enderecoEntrega}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-yellow-300" />
              <h3 className="text-sm font-semibold text-white">Produtos da loja neste pedido</h3>
            </div>

            <div className="mt-4 space-y-3">
              {pedido.itens.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-4 rounded-2xl border border-white/10 bg-black/30 p-3 sm:grid-cols-[96px_minmax(0,1fr)]"
                >
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                    <ProdutoImagem
                      src={item.imagemUrl}
                      sources={item.imagens}
                      alt={item.nomeProduto}
                      placeholderLabel={item.nomeProduto}
                      className="h-24 w-full object-cover"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-white">{item.nomeProduto}</p>
                        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                          {item.nomeLoja}
                        </p>
                      </div>

                      <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-medium text-yellow-200">
                        {item.quantidade}x
                      </span>
                    </div>

                    <p className="text-sm leading-6 text-neutral-300">{item.descricao}</p>

                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                      <span className="text-neutral-400">Unitario: {item.precoUnitario}</span>
                      <span className="font-semibold text-yellow-300">{item.valorTotal}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-yellow-300" />
                <h3 className="text-sm font-semibold text-white">Observacoes do pedido</h3>
              </div>

              <div className="mt-4 space-y-3 text-sm text-neutral-300">
                <p>{pedido.observacao}</p>
                {pedido.pedidoMultiloja ? (
                  <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-3 text-yellow-100">
                    <div className="flex items-start gap-2">
                      <Store className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />
                      <p>
                        Este pedido possui itens de outras lojas. O cancelamento pela loja fica
                        bloqueado enquanto o backend nao suportar cancelamento parcial por vendedor.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-yellow-300" />
                <h3 className="text-sm font-semibold text-white">Resumo financeiro</h3>
              </div>

              <div className="mt-4 space-y-3 text-sm text-neutral-300">
                <div className="flex items-center justify-between gap-4">
                  <span>Itens da loja</span>
                  <span>{pedido.subtotal}</span>
                </div>
                {pedido.valorTotalPedido ? (
                  <div className="flex items-center justify-between gap-4">
                    <span>Total do pedido</span>
                    <span>{pedido.valorTotalPedido}</span>
                  </div>
                ) : null}
                {!pedido.pedidoMultiloja && pedido.frete ? (
                  <div className="flex items-center justify-between gap-4">
                    <span>Frete do pedido</span>
                    <span>{pedido.frete}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-3">
                  <span className="font-medium text-white">Total considerado pela loja</span>
                  <span className="font-semibold text-yellow-300">{pedido.total}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" />
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-white">Acoes do vendedor</p>
                  <p className="mt-1 text-sm text-neutral-300">
                    O painel agora usa as permissoes devolvidas pelo backend para decidir quando a
                    loja pode enviar ou cancelar a propria venda.
                  </p>
                </div>

                {isCarregandoPedido ? (
                  <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-neutral-300">
                    Atualizando detalhes e regras desta venda...
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-3">
                      {podeMarcarComoEnviado ? (
                        <Botao
                          type="button"
                          onClick={() => onAvancarStatus(pedido)}
                          icon={<CheckCheck className="h-4 w-4" />}
                          disabled={isAtualizandoPedido}
                          className="sm:px-4"
                        >
                          {isAtualizandoPedido ? "Salvando..." : "Marcar como enviado"}
                        </Botao>
                      ) : (
                        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-neutral-300">
                          {mensagemBloqueioEnvio}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {podeCancelarPedido ? (
                        <Botao
                          type="button"
                          variant="secondary"
                          onClick={() => onCancelarPedido(pedido)}
                          icon={<XCircle className="h-4 w-4" />}
                          disabled={isAtualizandoPedido}
                          className="border-red-400/20 bg-red-400/10 text-red-100 hover:bg-red-400/20 sm:px-4"
                        >
                          Cancelar venda
                        </Botao>
                      ) : (
                        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-neutral-300">
                          {mensagemBloqueioCancelamento}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Botao
              type="button"
              variant="secondary"
              onClick={onClose}
              className="sm:w-auto sm:px-6"
            >
              Fechar
            </Botao>
          </div>
        </div>
      ) : null}
    </ProfileModal>
  );
}
