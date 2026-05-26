import { MessageSquareWarning } from "lucide-react";
import { Botao } from "../../../Components/Botao";
import { ProfileModal } from "../../../Components/perfil/ProfileModal";
import type { PerfilPedidoDetalhe } from "../../../types/perfil";

type DialogoCancelarPedidoVendaProps = {
  isOpen: boolean;
  motivo: string;
  pedido: PerfilPedidoDetalhe | null;
  onChangeMotivo: (motivo: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function DialogoCancelarPedidoVenda({
  isOpen,
  motivo,
  pedido,
  onChangeMotivo,
  onClose,
  onConfirm,
}: DialogoCancelarPedidoVendaProps) {
  return (
    <ProfileModal
      isOpen={isOpen}
      title={pedido ? `Cancelar pedido #${pedido.pedidoId}` : "Cancelar pedido"}
      description="Descreva o motivo do cancelamento para registrar a justificativa do vendedor."
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">
          <div className="flex items-start gap-3">
            <MessageSquareWarning className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              Esse motivo aparece como contexto operacional do cancelamento. A API ainda precisa
              receber essa justificativa para persistir no backend.
            </p>
          </div>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">Motivo do cancelamento</span>
          <textarea
            value={motivo}
            onChange={(event) => onChangeMotivo(event.target.value)}
            rows={5}
            placeholder="Ex.: produto indisponivel, endereco inconsistente ou impossibilidade de entrega."
            className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-yellow-400/40"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <Botao type="button" variant="secondary" onClick={onClose}>
            Voltar
          </Botao>
          <Botao type="button" onClick={onConfirm} disabled={motivo.trim().length === 0}>
            Confirmar cancelamento
          </Botao>
        </div>
      </div>
    </ProfileModal>
  );
}
