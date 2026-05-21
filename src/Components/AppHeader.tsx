import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronRight, House, LogIn, LogOut, ShoppingCart, UserRound } from "lucide-react";
import LogoOmnimarket from "../assets/Logo_omnimarket.jpg";
import { AUTH_CHANGED_EVENT, clearSession, isAuthenticated } from "../Services/auth/session";

// Lista centralizada de links do cabecalho para facilitar manutencao futura.
const navItems = [
  {
    to: "/",
    label: "Home",
    icon: House,
  },
  {
    to: "/perfilUsuario",
    label: "Perfil",
    icon: UserRound,
  },
  {
    to: "/carrinho",
    label: "Carrinho",
    icon: ShoppingCart,
  }
] as const;

export default function AppHeader() {
  // Le a rota atual para destacar visualmente a pagina ativa no menu.
  const { location } = useRouterState();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const [autenticado, setAutenticado] = useState(() => isAuthenticated());

  useEffect(() => {
    const sincronizarAutenticacao = () => {
      setAutenticado(isAuthenticated());
    };

    sincronizarAutenticacao();
    window.addEventListener(AUTH_CHANGED_EVENT, sincronizarAutenticacao);
    window.addEventListener("storage", sincronizarAutenticacao);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, sincronizarAutenticacao);
      window.removeEventListener("storage", sincronizarAutenticacao);
    };
  }, []);

  function getNavItemClasses(isActive: boolean) {
    return `inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
      isActive
        ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-300"
        : "border-white/10 bg-white/5 text-neutral-200 hover:border-white/20 hover:bg-white/10 hover:text-white"
    }`;
  }

  function handleLogout() {
    clearSession();
    void navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Bloco da marca com logo e texto institucional. */}
          <Link
            to="/"
            className="flex items-center gap-4 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,_rgba(255,255,255,0.05),_rgba(255,255,255,0.02))] px-4 py-3 transition hover:border-yellow-400/30 hover:bg-white/10"
          >
            <img
              src={LogoOmnimarket}
              alt="Logo do OmniMarket"
              className="h-14 w-14 rounded-2xl object-cover hover:animate-spin"
            />

            <div className="space-y-1">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-yellow-300">
                OmniMarket
              </p>
              <p className="text-sm text-neutral-400">
                Marketplace visual com tema dark
              </p>
            </div>
          </Link>

          {/* Navegacao principal com destaque para a rota atual. */}
          <nav className="flex flex-wrap items-center gap-2">
            {navItems.slice(0, 1).map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.to;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={getNavItemClasses(isActive)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}

            {autenticado ? (
              <button
                type="button"
                onClick={handleLogout}
                className={getNavItemClasses(false)}
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            ) : (
              <Link to="/login" className={getNavItemClasses(pathname === "/login")}>
                <LogIn className="h-4 w-4" />
                Entrar
              </Link>
            )}

            {navItems.slice(1).map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.to;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={getNavItemClasses(isActive)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Linha de contexto para manter o header mais informativo e alinhado com a Home nova. */}
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-neutral-500">
          <span>Navegacao</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-neutral-300">
            {pathname === "/"
              ? "Vitrine principal"
              : pathname === "/login"
                ? "Entrada da conta"
                : pathname === "/cadastro"
                  ? "Criacao de conta"
                  : pathname === "/perfilUsuario"
                    ? "Perfil do usuario"
                    : "Pagina"}
          </span>
        </div>
      </div>
    </header>
  );
}
