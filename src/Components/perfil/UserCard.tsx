import type { UsuarioPerfil } from "../../types/perfil";
import { Botao } from "../Botao";
import { ProfileSection } from "./ProfileSection";
import { UserInfo } from "./UserInfo";
import { Camera, PencilLine, Store } from "lucide-react";

// Exibe o resumo principal do usuario com avatar, nome e contatos.
interface UserCardProps {
  usuario: UsuarioPerfil | null;
  onEditAvatar: () => void;
  onEditProfile: () => void;
  onStoreAction: () => void;
  storeActionLabel: string;
  canManageStore: boolean;
}

// Gera as iniciais para quando a foto real ainda nao estiver disponivel.
function obterIniciais(nome: string | undefined) {
  if (!nome) {
    return "U";
  }

  const partesDoNome = nome.trim().split(" ").filter(Boolean);
  const primeiraParte = partesDoNome[0]?.[0] ?? "";
  const ultimaParte = partesDoNome[1]?.[0] ?? "";

  return `${primeiraParte}${ultimaParte}`.toUpperCase();
}

export function UserCard({
  usuario,
  onEditAvatar,
  onEditProfile,
  onStoreAction,
  storeActionLabel,
  canManageStore,
}: UserCardProps) {
  return (
    <ProfileSection className="h-full">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <button
            type="button"
            onClick={onEditAvatar}
            className="group relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70"
            aria-label="Alterar foto do perfil"
          >
            {usuario?.avatarUrl ? (
              <img
                src={usuario.avatarUrl}
                alt={`Avatar de ${usuario.nome}`}
                className="h-54 w-40 rounded-full border-4 border-yellow-400 object-cover transition group-hover:brightness-75 sm:h-54 sm:w-60"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-yellow-400 bg-black text-3xl font-bold text-yellow-400 transition group-hover:bg-neutral-950 sm:h-32 sm:w-32">
                {obterIniciais(usuario?.nome)}
              </div>
            )}

            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/65 text-white opacity-0 transition group-hover:opacity-100">
              <Camera className="h-5 w-5" />
            </span>
          </button>

          <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
            Clique na foto para alterar
          </p>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.32em] text-yellow-400">
              Perfil do usuario
            </p>
            <h1 className="text-2xl font-semibold text-white">
              {usuario?.nome || "Usuario sem nome cadastrado"}
            </h1>
            <p className="text-sm text-neutral-400">
              {usuario?.resumo || "Area pronta para bio, cargo ou descricao curta do usuario."}
            </p>
          </div>

          <div className="inline-flex rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-yellow-300">
            {usuario?.contaVerificada ? "Conta verificada" : "Conta em configuracao"}
          </div>
        </div>

        <div className="border-t border-white/10" />

        <UserInfo usuario={usuario} />

        <div className="rounded-2xl border border-dashed border-yellow-400/25 bg-yellow-400/5 px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Botao
              onClick={onEditProfile}
              className="h-11 text-sm"
              icon={<PencilLine className="h-4 w-4" />}
            >
              Editar perfil
            </Botao>

            <Botao
              onClick={onStoreAction}
              variant="secondary"
              disabled={!canManageStore}
              className="h-11 border-white/10 bg-white/5 text-sm hover:bg-white/10"
              icon={<Store className="h-4 w-4" />}
            >
              {storeActionLabel}
            </Botao>
          </div>

          <p className="mt-3 text-sm text-neutral-400">
            {canManageStore
              ? "Sua loja pode usar o endereco e o telefone principal que ja estao cadastrados no perfil."
              : "Cadastre um telefone e um endereco principal para liberar a criacao da loja."}
          </p>
        </div>
      </div>
    </ProfileSection>
  );
}
