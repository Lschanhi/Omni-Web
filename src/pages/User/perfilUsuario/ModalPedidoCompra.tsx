import { useEffect, useState } from "react";
import {
  CalendarDays,
  CircleAlert,
  MapPin,
  PackageCheck,
  RefreshCcw,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";
import { Botao } from "../../../Components/Botao";
import { ProfileModal } from "../../../Components/perfil/ProfileModal";
import { ProdutoImagem } from "../../../Components/produto/ProdutoImagem";
import type { PerfilPedidoDetalhe } from "../../../types/perfil";

type ModalPedidoCompraProps = {
  descricao: string;
  isOpen: boolean;
  pedido: PerfilPedidoDetalhe | null;
  onClose: () => void;
  onConfirmarRecebimento: (pedido: PerfilPedidoDetalhe) => void;
  onSolicitarCancelamento: (pedido: PerfilPedidoDetalhe) => void;
  onSolicitarTroca: (pedido: PerfilPedidoDetalhe) => void;
};

export function ModalPedidoCompra({
  descricao,
  isOpen,
  pedido,
  onClose,
  onConfirmarRecebimento,
  onSolicitarCancelamento,
  onSolicitarTroca,
}: ModalPedidoCompraProps) {
  const [mostrarOpcoesProblema, setMostrarOpcoesProblema] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setMostrarOpcoesProblema(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setMostrarOpcoesProblema(false);
  }, [pedido?.pedidoId]);

  return (
    <ProfileModal
      isOpen={isOpen}
      title={pedido ? `Detalhes do pedido #${pedido.pedidoId}` : "Detalhes do pedido"}
      description={descricao}
      onClose={onClose}
    >
      {pedido ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Status</p>
              <p className="mt-2 text-sm font-semibold text-white">{pedido.status}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
                <CalendarDays className="h-4 w-4" />
                <span>Data</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-white">{pedido.dataPedido}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Total</p>
              <p className="mt-2 text-sm font-semibold text-yellow-300">{pedido.total}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-yellow-300" />
              <h3 className="text-sm font-semibold text-white">Itens do pedido</h3>
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

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
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
                <p>
                  <span className="text-neutral-500">Observacao:</span> {pedido.observacao}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-yellow-300" />
                <h3 className="text-sm font-semibold text-white">Resumo financeiro</h3>
              </div>

              <div className="mt-4 space-y-3 text-sm text-neutral-300">
                <div className="flex items-center justify-between gap-4">
                  <span>Subtotal</span>
                  <span>{pedido.subtotal}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Frete</span>
                  <span>{pedido.frete}</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-3">
                  <span className="font-medium text-white">Total</span>
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
                  <p className="text-sm font-semibold text-white">Acompanhamento do pedido</p>
                  <p className="mt-1 text-sm text-neutral-300">
                    As acoes abaixo ja estao prontas na interface. Ainda falta ligar esse fluxo a
                    um endpoint da API para persistir o pedido de recebimento, cancelamento ou
                    troca.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Botao
                    type="button"
                    onClick={() => onConfirmarRecebimento(pedido)}
                    icon={<PackageCheck className="h-4 w-4" />}
                    className="sm:px-4"
                  >
                    Confirmar recebimento
                  </Botao>

                  <Botao
                    type="button"
                    variant="secondary"
                    onClick={() => setMostrarOpcoesProblema((currentState) => !currentState)}
                    icon={<CircleAlert className="h-4 w-4" />}
                    className="sm:px-4"
                  >
                    Problemas com o pedido
                  </Botao>
                </div>

                {mostrarOpcoesProblema ? (
                  <div className="grid gap-3 border-t border-white/10 pt-3 sm:grid-cols-2">
                    <Botao
                      type="button"
                      variant="secondary"
                      onClick={() => onSolicitarCancelamento(pedido)}
                      icon={<XCircle className="h-4 w-4" />}
                      className="border-red-400/20 bg-red-400/10 text-red-100 hover:bg-red-400/20 sm:px-4"
                    >
                      Solicitar cancelamento
                    </Botao>

                    <Botao
                      type="button"
                      variant="secondary"
                      onClick={() => onSolicitarTroca(pedido)}
                      icon={<RefreshCcw className="h-4 w-4" />}
                      className="sm:px-4"
                    >
                      Solicitar troca
                    </Botao>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Botao type="button" variant="secondary" onClick={onClose} className="sm:w-auto sm:px-6">
              Fechar
            </Botao>
          </div>
        </div>
      ) : null}
    </ProfileModal>
  );
}
