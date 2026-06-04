import { useEffect, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { PageLayout } from "../../Components/PageLayout";
import { Spotlight } from "../../Components/home/SpotLight";
import { ProfileSection } from "../../Components/perfil/ProfileSection";
import { ProductGrid } from "../../Components/perfil/ProductGrid";
import Stars from "../../Components/RatingStar/Stars";

export function LojaPublicaPage() {
  const { idLoja, nomeLoja } = useParams({ strict: false });

  const [isLoading, setIsLoading] = useState(true);

  // MOCK TEMPORÁRIO
  const [loja, setLoja] = useState({
    nome: "",
    descricao: "",
    avatar: "",
    banner: "",
    avaliacao: 4.9,
    totalProdutos: 12,
    totalVendas: 245,
    produtos: [],
  });

  useEffect(() => {
    async function carregarLoja() {
      try {
        setIsLoading(true);

        // FUTURA API
        // const response = await obterLojaPorSlug(nomeLoja);

        // MOCK
        setTimeout(() => {
          setLoja({
            nome: nomeLoja ?? "",
            descricao:
              "Bem-vindo à nossa loja. Aqui você encontra produtos de qualidade com envio rápido e atendimento especializado.",
            avatar:
              "https://placehold.co/200x200/png",
            banner:
              "https://placehold.co/1400x400/png",
            avaliacao: 4.9,
            totalProdutos: 12,
            totalVendas: 245,
            produtos: [],
          });

          setIsLoading(false);
        }, 500);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
      }
    }

    carregarLoja();
  }, [nomeLoja]);

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex min-h-screen items-center justify-center text-white">
          Carregando loja...
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">

          {/* HERO */}
          <Spotlight>
            <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.14),_transparent_42%),linear-gradient(180deg,_rgba(255,255,255,0.04),_rgba(255,255,255,0.01))] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">

              {/* Banner */}
              <div className="h-52 w-full overflow-hidden border-b border-white/10">
                <img
                  src={loja.banner}
                  alt={loja.nome}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="p-6 sm:p-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-center">

                  {/* Avatar */}
                  <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-yellow-400/30">
                    <img
                      src={loja.avatar}
                      alt={loja.nome}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Informações */}
                  <div className="space-y-3">
                    <span className="inline-flex rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-1 text-sm font-medium text-yellow-300">
                      Loja verificada
                    </span>

                    <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                      {loja.nome}
                    </h1>

                    <p className="max-w-2xl text-sm leading-6 text-neutral-400 sm:text-base">
                      {loja.descricao}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </Spotlight>

          {/* ESTATÍSTICAS */}
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm text-neutral-400">
                Avaliação
              </p>

              <Stars
                nota={loja.avaliacao}
                className="mt-3 w-full"
                tamanho="lg"
              />
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm text-neutral-400">
                Produtos
              </p>

              <h2 className="mt-2 text-3xl font-bold text-white">
                {loja.totalProdutos}
              </h2>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm text-neutral-400">
                Vendas
              </p>

              <h2 className="mt-2 text-3xl font-bold text-white">
                {loja.totalVendas}
              </h2>
            </div>
          </section>

          {/* PRODUTOS */}
          <ProfileSection
            title="Produtos da loja"
            description="Confira todos os produtos disponíveis nesta loja."
          >
            {loja.produtos.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-neutral-400">
                Nenhum produto disponível.
              </div>
            ) : (
              <ProductGrid
                itens={loja.produtos}
              />
            )}
          </ProfileSection>
        </div>
      </div>
    </PageLayout>
  );
}
