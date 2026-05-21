import { useEffect, useState, type ChangeEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PageLayout } from "../../Components/PageLayout";
import { Input } from "../../Components/Input";
import { useCart } from "../../context/CartContext";
import { criarEndereco } from "../../Services/user/enderecoService";
import { confirmarPagamentoFake, iniciarPagamento } from "../../Services/financeiro/financeiroService";
import { criarPedido } from "../../Services/pedidos/pedidoService";
import { isAuthenticated } from "../../Services/auth/session";
import { obterPerfilUsuario, type UsuarioPerfilApiResponse } from "../../Services/user/usuarioService";

type MetodoPagamento = {
  id: string;
  titulo: string;
  descricao: string;
};

const METODOS_PAGAMENTO: MetodoPagamento[] = [
  {
    id: "pix",
    titulo: "PIX",
    descricao: "Confirmacao rapida apos a finalizacao da compra.",
  },
  {
    id: "credito",
    titulo: "Cartao de credito",
    descricao: "Ideal para parcelamento e pagamentos online.",
  },
  {
    id: "debito",
    titulo: "Cartao de debito",
    descricao: "Debito imediato com validacao simples.",
  },
  {
    id: "boleto",
    titulo: "Boleto bancario",
    descricao: "Ainda nao disponivel na API atual.",
  },
];

export function PagamentPage() {
  const [metodo, setMetodo] = useState("pix");
  const [freteSelecionado, setFreteSelecionado] = useState("padrao");
  const [enderecoForm, setEnderecoForm] = useState({
    cep: "",
    cidade: "",
    rua: "",
    numero: "",
    complemento: "",
    uf: "",
  });
  const [perfil, setPerfil] = useState<UsuarioPerfilApiResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [erro, setErro] = useState("");
  const { carrinhoItens, valorTotal, clearCart, estaAutenticado } = useCart();
  const navigate = useNavigate();

  const total = valorTotal;
  const opcoesEntrega = [
    {
      id: "padrao",
      titulo: "Entrega padrao",
      prazo: "Receba em ate 5 dias uteis",
      valor: "Gratis",
    },
    {
      id: "expresso",
      titulo: "Entrega expressa",
      prazo: "Receba em ate 2 dias uteis",
      valor: "R$ 19,90",
    },
    {
      id: "retirada",
      titulo: "Retirada na loja",
      prazo: "Disponivel em 1 dia util",
      valor: "Sem custo",
    },
  ];

  useEffect(() => {
    let isMounted = true;

    if (!estaAutenticado) {
      return;
    }

    async function carregarPerfil() {
      try {
        const response = await obterPerfilUsuario();

        if (isMounted) {
          setPerfil(response);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar os dados do usuario.";
        setErro(message);
      }
    }

    void carregarPerfil();

    return () => {
      isMounted = false;
    };
  }, [estaAutenticado]);

  function handleEnderecoChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setEnderecoForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function mapearFormaPagamentoId() {
    switch (metodo) {
      case "pix":
        return 1;
      case "debito":
        return 3;
      case "credito":
        return 4;
      default:
        return null;
    }
  }

  function mapearTipoEntregaId() {
    switch (freteSelecionado) {
      case "retirada":
        return 1;
      case "expresso":
        return 4;
      default:
        return 3;
    }
  }

  function enderecoFoiPreenchido() {
    return Object.values(enderecoForm).some((value) => value.trim().length > 0);
  }

  async function resolverEnderecoId() {
    const perfilAtual = perfil ?? (await obterPerfilUsuario());
    const enderecoPrincipal =
      perfilAtual.enderecos.find((endereco) => endereco.isPrincipal) ??
      perfilAtual.enderecos[0];

    if (!enderecoFoiPreenchido()) {
      return enderecoPrincipal?.id;
    }

    const cep = enderecoForm.cep.replace(/\D/g, "");

    if (
      !cep ||
      !enderecoForm.cidade.trim() ||
      !enderecoForm.rua.trim() ||
      !enderecoForm.numero.trim() ||
      !enderecoForm.uf.trim()
    ) {
      throw new Error("Preencha CEP, cidade, rua, numero e UF para usar um novo endereco.");
    }

    const enderecoCriado = await criarEndereco(perfilAtual.id, {
      cep,
      tipoLogradouro: "Rua",
      nomeEndereco: enderecoForm.rua.trim(),
      numero: enderecoForm.numero.trim(),
      complemento: enderecoForm.complemento.trim() || undefined,
      cidade: enderecoForm.cidade.trim(),
      uf: enderecoForm.uf.trim().toUpperCase(),
      isPrincipal: perfilAtual.enderecos.length === 0,
    });

    return enderecoCriado.id;
  }

  async function handleFinalizarCompra() {
    if (!isAuthenticated()) {
      navigate({ to: "/login" });
      return;
    }

    if (carrinhoItens.length === 0) {
      setErro("Seu carrinho esta vazio.");
      return;
    }

    const formaPagamentoId = mapearFormaPagamentoId();

    if (!formaPagamentoId) {
      setErro("O metodo de pagamento selecionado ainda nao esta disponivel na API.");
      return;
    }

    setIsSubmitting(true);
    setErro("");

    try {
      const enderecoId = await resolverEnderecoId();

      if (!enderecoId) {
        throw new Error("Cadastre ou informe um endereco de entrega antes de continuar.");
      }

      const pedido = await criarPedido({
        enderecoId,
        tipoEntregaId: mapearTipoEntregaId(),
        observacao: "",
        itens: [],
      });

      const pagamento = await iniciarPagamento({
        pedidoId: pedido.pedidoId,
        formaPagamentoId,
        observacao: `Checkout web via ${metodo}`,
      });

      const confirmacao = await confirmarPagamentoFake(pagamento.planoPagamentoId);

      await clearCart();

      navigate({
        to: "/paginaSucesso",
        state: (currentState) => ({
          ...currentState,
          checkoutResult: {
            pedidoId: pedido.pedidoId,
            total: pedido.valorTotal,
            metodoPagamento:
              METODOS_PAGAMENTO.find((item) => item.id === metodo)?.titulo ?? metodo,
            statusPagamento: confirmacao.statusPagamento,
            itens: carrinhoItens.map((item) => ({
              produtoId: item.produtoId,
              nome: item.nome,
              quantidade: item.quantidade,
              subtotal: item.subtotal,
            })),
          },
        }),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel finalizar a compra.";
      setErro(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageLayout>
      <div className="min-h-screen bg-black px-4 py-8 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-2xl border border-white/10 bg-zinc-900/80 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:p-6">
              <div className="mb-6 flex flex-col gap-2 border-b border-white/10 pb-5">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-yellow-400/80">
                  Etapa 1
                </span>
                <h2 className="text-2xl font-semibold text-white">Endereco de entrega</h2>
                <p className="max-w-2xl text-sm leading-6 text-zinc-400">
                  Preencha os dados abaixo para usar um novo endereco ou deixe em
                  branco para aproveitar o endereco principal ja cadastrado.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  id="cep"
                  name="cep"
                  label="CEP"
                  placeholder="00000-000"
                  autoComplete="postal-code"
                  value={enderecoForm.cep}
                  onChange={handleEnderecoChange}
                  className="h-12 rounded-2xl border-white/10 bg-black/40 px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                />
                <Input
                  id="cidade"
                  name="cidade"
                  label="Cidade"
                  placeholder="Sua cidade"
                  autoComplete="address-level2"
                  value={enderecoForm.cidade}
                  onChange={handleEnderecoChange}
                  className="h-12 rounded-2xl border-white/10 bg-black/40 px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                />
                <div className="sm:col-span-2">
                  <Input
                    id="rua"
                    name="rua"
                    label="Rua"
                    placeholder="Nome da rua, avenida ou alameda"
                    autoComplete="address-line1"
                    value={enderecoForm.rua}
                    onChange={handleEnderecoChange}
                    className="h-12 rounded-2xl border-white/10 bg-black/40 px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                  />
                </div>
                <Input
                  id="numero"
                  name="numero"
                  label="Numero"
                  placeholder="Ex.: 123"
                  inputMode="numeric"
                  autoComplete="address-line2"
                  value={enderecoForm.numero}
                  onChange={handleEnderecoChange}
                  className="h-12 rounded-2xl border-white/10 bg-black/40 px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                />
                <Input
                  id="complemento"
                  name="complemento"
                  label="Complemento"
                  placeholder="Apartamento, bloco, referencia"
                  autoComplete="additional-name"
                  value={enderecoForm.complemento}
                  onChange={handleEnderecoChange}
                  className="h-12 rounded-2xl border-white/10 bg-black/40 px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                />
                <Input
                  id="uf"
                  name="uf"
                  label="UF"
                  placeholder="SP"
                  autoComplete="address-level1"
                  value={enderecoForm.uf}
                  onChange={handleEnderecoChange}
                  className="h-12 rounded-2xl border-white/10 bg-black/40 px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                />
              </div>

              {perfil?.enderecos.length ? (
                <p className="mt-4 text-sm text-zinc-400">
                  Se voce deixar o formulario acima em branco, o checkout usa o
                  endereco principal ja cadastrado na sua conta.
                </p>
              ) : null}
            </section>

            <section className="rounded-2xl border border-white/10 bg-zinc-900/80 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:p-6">
              <fieldset className="space-y-4">
                <div className="mb-2 flex flex-col gap-2 border-b border-white/10 pb-5">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-yellow-400/80">
                    Etapa 2
                  </span>
                  <legend className="text-2xl font-semibold text-white">Opcoes de entrega</legend>
                  <p className="text-sm leading-6 text-zinc-400">
                    Escolha a modalidade que melhor se encaixa no seu prazo e preferencia.
                  </p>
                </div>

                <div className="grid gap-3">
                  {opcoesEntrega.map((opcao) => {
                    const selecionado = freteSelecionado === opcao.id;

                    return (
                      <label
                        key={opcao.id}
                        htmlFor={opcao.id}
                        className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition duration-200 hover:border-yellow-400/60 hover:bg-black/30 ${
                          selecionado
                            ? "border-yellow-400 bg-yellow-400/10 shadow-[0_0_0_1px_rgba(250,204,21,0.20)]"
                            : "border-white/10 bg-black/20"
                        }`}
                      >
                        <input
                          id={opcao.id}
                          type="radio"
                          name="frete"
                          checked={selecionado}
                          onChange={() => setFreteSelecionado(opcao.id)}
                          className="mt-1 h-4 w-4 border-white/20 bg-transparent text-yellow-400 focus:ring-2 focus:ring-yellow-400/30"
                        />

                        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-white">{opcao.titulo}</p>
                            <p className="text-sm text-zinc-400">{opcao.prazo}</p>
                          </div>
                          <span className="text-sm font-semibold text-yellow-400">
                            {opcao.valor}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </section>

            <section className="rounded-2xl border border-white/10 bg-zinc-900/80 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:p-6">
              <div className="mb-6 flex flex-col gap-2 border-b border-white/10 pb-5">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-yellow-400/80">
                  Etapa 3
                </span>
                <h2 className="text-2xl font-semibold text-white">Forma de pagamento</h2>
                <p className="text-sm leading-6 text-zinc-400">
                  Selecione a forma de pagamento desejada para concluir seu checkout.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {METODOS_PAGAMENTO.map((tipo) => {
                  const selecionado = metodo === tipo.id;
                  const indisponivel = tipo.id === "boleto";

                  return (
                    <button
                      key={tipo.id}
                      type="button"
                      onClick={() => setMetodo(tipo.id)}
                      aria-pressed={selecionado}
                      disabled={indisponivel}
                      className={`rounded-2xl border p-4 text-left transition duration-200 hover:border-yellow-400/60 hover:bg-black/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/30 ${
                        selecionado
                          ? "border-yellow-400 bg-yellow-400/10 shadow-[0_0_0_1px_rgba(250,204,21,0.20)]"
                          : "border-white/10 bg-black/20"
                      } ${indisponivel ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{tipo.titulo}</p>
                          <p className="mt-1 text-sm leading-6 text-zinc-400">
                            {tipo.descricao}
                          </p>
                          {indisponivel ? (
                            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-yellow-400/80">
                              Em breve
                            </p>
                          ) : null}
                        </div>
                        <span
                          className={`mt-1 h-3 w-3 rounded-full transition ${
                            selecionado
                              ? "bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.65)]"
                              : "bg-white/20"
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              {metodo === "credito" ? (
                <div className="mt-5 grid grid-cols-1 gap-4 rounded-2xl border border-yellow-400/20 bg-black/30 p-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Input
                      required
                      id="numero-cartao"
                      name="numero-cartao"
                      label="Numero do cartao"
                      placeholder="0000 0000 0000 0000"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      className="h-12 rounded-2xl border-white/10 bg-black/40 px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                    />
                  </div>
                  <Input
                    required
                    id="validade-cartao"
                    name="validade-cartao"
                    label="Validade"
                    placeholder="MM/AA"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    className="h-12 rounded-2xl border-white/10 bg-black/40 px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                  />
                  <Input
                    required
                    id="nome-cartao"
                    name="nome-cartao"
                    label="Nome impresso no cartao"
                    placeholder="Como aparece no cartao"
                    autoComplete="cc-name"
                    className="h-12 rounded-2xl border-white/10 bg-black/40 px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                  />
                </div>
              ) : null}

              {metodo === "pix" ? (
                <div className="mt-5 rounded-2xl border border-yellow-400/20 bg-black/30 p-4">
                  <p className="text-sm leading-6 text-neutral-400">
                    O pagamento fake sera confirmado automaticamente ao finalizar a compra.
                  </p>
                </div>
              ) : null}
            </section>
          </div>

          <div className="lg:col-span-1">
            <aside className="space-y-4 rounded-2xl border border-white/10 p-5">
              <h2 className="text-xl font-semibold">Resumo do pedido</h2>

              {carrinhoItens.map((item) => (
                <div key={item.produtoId} className="flex gap-3">
                  <img
                    src={item.imagem}
                    alt={item.nome}
                    className="h-16 w-16 rounded-2xl object-cover"
                  />

                  <div className="flex-1 py-2">
                    <p className="pb-2 text-[16px]">{item.nome}</p>
                    <p className="font-semibold">
                      Valor unitario: R$ {item.preco.toFixed(2)}
                    </p>
                    <p>Quantidade: {item.quantidade}</p>
                    <p className="text-yellow-400">
                      Valor total: R$ {item.subtotal.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}

              <div className="border-t border-white/10 pt-4">
                <div className="flex text-[30px] font-bold">
                  <p className="px-3">Total:</p>
                  <p className="text-emerald-300">R$ {total.toFixed(2)}</p>
                </div>
              </div>

              {erro ? (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {erro}
                </div>
              ) : null}

              <button
                className="w-full rounded-xl bg-yellow-400 py-3 text-black disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => {
                  void handleFinalizarCompra();
                }}
                disabled={isSubmitting || !estaAutenticado || carrinhoItens.length === 0}
              >
                {isSubmitting ? "Processando..." : "Finalizar compra"}
              </button>
            </aside>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
