import { Link, useRouterState } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { useCart } from "../context/CartContext";

type PageLayoutProps = {
  children: React.ReactNode
}

export function PageLayout({ children }: PageLayoutProps) {
  const { totalItens } = useCart();
  const { location } = useRouterState();
  const esconderCarrinhoFlutuante = location.pathname === "/carrinho";

  return (
    <div className="min-h-screen w-full bg-black">
      {children}

      {!esconderCarrinhoFlutuante ? (
        <Link
          to="/carrinho"
          className="fixed bottom-5 right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full border border-yellow-400/35 bg-black/85 text-yellow-300 shadow-[0_18px_40px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:border-yellow-400/60 hover:bg-yellow-400/10 hover:text-yellow-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 md:bottom-auto md:top-1/2 md:-translate-y-1/2"
          aria-label="Abrir carrinho"
          title="Carrinho"
        >
          <ShoppingCart className="h-6 w-6" />

          {totalItens > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-yellow-400 px-1 text-[10px] font-bold text-black">
              {totalItens > 99 ? "99+" : totalItens}
            </span>
          ) : null}
        </Link>
      ) : null}
    </div>
  )
}
