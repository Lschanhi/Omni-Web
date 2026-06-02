import type { PerfilStatCardItem } from "../../types/perfil";
import Stars from "../RatingStar/Stars";
import { ProfileSection } from "./ProfileSection";

// Exibe os principais indicadores do contexto ativo em um grid responsivo.
interface UserStatsProps {
  title: string;
  description: string;
  stats: PerfilStatCardItem[];
}

export function UserStats({ title, description, stats }: UserStatsProps) {
  return (
    <ProfileSection title={title} description={description}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(({ key, label, value }) => {
          const nota = Number.parseFloat(value.replace(",", "."));
          const isValorLongo = key === "faturamento-bruto" || key === "ticket-medio";

          return (
            <div
              key={key}
              className="min-w-0 rounded-2xl border border-white/8 bg-black/45 px-4 py-4"
            >
              <p className="break-words text-xs uppercase tracking-[0.22em] text-neutral-500">
                {label}
              </p>
              {key === "avaliacao-media" && Number.isFinite(nota) ? (
                <Stars nota={nota} className="mt-3 w-full" tamanho="sm" />
              ) : (
                <p
                  className={`mt-3 max-w-full break-words font-semibold leading-tight text-white ${
                    isValorLongo ? "text-base sm:text-lg xl:text-[clamp(0.85rem,1vw,1.125rem)]" : "text-xl"
                  }`.trim()}
                >
                  {value}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </ProfileSection>
  );
}
