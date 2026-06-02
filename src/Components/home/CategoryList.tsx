import {
  Gamepad2,
  Headphones,
  Shirt,
  Smartphone,
  Sofa,
  Watch,
  ChevronLeft,
  ChevronRight,
  Candy,
} from "lucide-react";
import type { HomeCategory } from "../../types/home";
import { useEffect, useRef, useState } from "react";

//para os botões de esquerda e direita na lista de categoria

// Define os dados de controle da lista horizontal de categorias.
type CategoryListProps = {
  categorias: HomeCategory[];
  categoriaAtiva: string;
  onSelect: (categoriaId: string) => void;
};

// Mapeia o nome do icone informado nos mocks para o componente visual correspondente.
const iconMap = {
  smartphone: Smartphone,
  shirt: Shirt,
  gamepad: Gamepad2,
  sofa: Sofa,
  headphones: Headphones,
  watch: Watch,
  Doces: Candy
};

// Renderiza a faixa horizontal de categorias, preparada para scroll em telas menores.
export function CategoryList({
  categorias,
  categoriaAtiva,
  onSelect,
}: CategoryListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [mostrarEsquerda, setMostrarEsquerda] = useState(false);
  const [mostrarDireita, setMostrarDireita] = useState(false);

  const verificarScroll = () => {
    const container = containerRef.current;

    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;

    setMostrarEsquerda(scrollLeft > 0);
    setMostrarDireita(scrollLeft < scrollWidth - clientWidth - 5);
  };

  const scrollEsquerda = () => {
    containerRef.current?.scrollBy({
      left: -300,
      behavior: "smooth",
    });
  };

  const scrollDireita = () => {
    containerRef.current?.scrollBy({
      left: 300,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    verificarScroll();

    const container = containerRef.current;

    if (!container) return;

    container.addEventListener("scroll", verificarScroll);
    window.addEventListener("resize", verificarScroll);

    return () => {
      container.removeEventListener("scroll", verificarScroll);
      window.removeEventListener("resize", verificarScroll);
    };
  }, [categorias]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            Categorias
          </h2>
          <p className="text-sm text-neutral-400">
            Navegue por coleções como em um marketplace real.
          </p>
        </div>
      </div>

      <div className="relative">
        {mostrarEsquerda && (
          <button
            onClick={scrollEsquerda}
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-black/80 p-2 text-white">
            <ChevronLeft size={20} />
          </button>
        )}

        <div
          ref={containerRef}
          className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categorias.map((categoria) => {
            const Icone = iconMap[categoria.icone];
            const isAtiva = categoriaAtiva === categoria.id;

            return (
              <button
                key={categoria.id}
                type="button"
                onClick={() => onSelect(categoria.id)}
                className={`flex min-w-[140px] max-w-[240px] shrink-0 items-center gap-3 rounded-[24px] border px-4 py-4 text-left transition sm:max-w-none ${
                  isAtiva
                    ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-300"
                    : "border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10"
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                    isAtiva ? "bg-yellow-400/15" : "bg-black/40"
                  }`}
                >
                  <Icone className="h-5 w-5" />
                </span>

                <span className="min-w-0 whitespace-normal break-words text-sm font-medium leading-tight">
                  {categoria.nome}
                </span>
              </button>
            );
          })}
        </div>

        {mostrarDireita && (
          <button
            onClick={scrollDireita}
            className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-black/80 p-2 text-white">
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    </section>
  );
}
