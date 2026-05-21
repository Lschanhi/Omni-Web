import { useEffect, useState, type ChangeEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Minus, Plus } from "lucide-react";
import { PageLayout } from "../../Components/PageLayout";
import { Input } from "../../Components/Input";
import { useCart } from "../../context/CartContext";
import {
  criarEndereco,
  listarEnderecos,
  listarTiposLogradouro,
  TIPOS_LOGRADOURO_FALLBACK,
  type EnderecoApiResponse,
  type TipoLogradouroOption,
} from "../../Services/user/enderecoService";
import {
  confirmarPagamentoFake,
  iniciarPagamento,
} from "../../Services/financeiro/financeiroService";
import { criarPedido } from "../../Services/pedidos/pedidoService";
import { isAuthenticated } from "../../Services/auth/session";
import {
  obterPerfilUsuario,
  type UsuarioPerfilApiResponse,
} from "../../Services/user/usuarioService";

type MetodoPagamento = {
  id: string;
  titulo: string;
  descricao: string;
};

type EnderecoFormState = {
  tipoLogradouro: string;
  nomeEndereco: string;
  numero: string;
  complemento: string;
  cep: string;
  cidade: string;
  uf: string;
  isPrincipal: boolean;
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

const ENDERECO_FORM_PADRAO: EnderecoFormState = {
  tipoLogradouro: "Rua",
  nomeEndereco: "",
  numero: "",
  complemento: "",
  cep: "",
  cidade: "",
  uf: "",
  isPrincipal: false,
};

function criarEnderecoFormInicial(tipoLogradouroPadrao = "Rua", isPrincipal = false) {
  return {
    ...ENDERECO_FORM_PADRAO,
    tipoLogradouro: tipoLogradouroPadrao,
    isPrincipal,
  };
}

function normalizarCep(cep: string) {
  return cep.replace(/\D/g, "");
}

function formatarCep(cep: string) {
  const cepNormalizado = normalizarCep(cep);

  if (cepNormalizado.length !== 8) {
    return cep;
  }

  return `${cepNormalizado.slice(0, 5)}-${cepNormalizado.slice(5)}`;
}

function enderecoTemConteudo(endereco: EnderecoFormState) {
  return Boolean(
    endereco.nomeEndereco.trim() ||
      endereco.numero.trim() ||
      endereco.complemento.trim() ||
      endereco.cep.trim() ||
      endereco.cidade.trim() ||
      endereco.uf.trim(),
  );
}

function enderecoEstaCompleto(endereco: EnderecoFormState) {
  return Boolean(
    endereco.tipoLogradouro.trim() &&
      endereco.nomeEndereco.trim() &&
      endereco.numero.trim() &&
      normalizarCep(endereco.cep).length === 8 &&
      endereco.cidade.trim() &&
      endereco.uf.trim().length === 2,
  );
}

function mapearEnderecoPerfilParaDetalhe(
  endereco: UsuarioPerfilApiResponse["enderecos"][number],
): EnderecoApiResponse {
  return {
    id: endereco.id,
    tipoLogradouro: endereco.tipoLogradouro,
    nomeEndereco: endereco.nomeEndereco,
    numero: endereco.numero,
    complemento: "",
    cep: endereco.cep,
    cidade: endereco.cidade,
    uf: endereco.uf,
    isPrincipal: endereco.isPrincipal,
    ativo: endereco.ativo,
  };
}

function obterEnderecoPrincipal(enderecos: EnderecoApiResponse[]) {
  return enderecos.find((endereco) => endereco.isPrincipal) ?? enderecos[0] ?? null;
}

function formatarResumoEndereco(endereco: EnderecoApiResponse) {
  return `${endereco.tipoLogradouro} ${endereco.nomeEndereco}, ${endereco.numero}`;
}

function formatarDetalheEndereco(endereco: EnderecoApiResponse) {
  const partes = [`${endereco.cidade}, ${endereco.uf}`];

  if (endereco.complemento?.trim()) {
    partes.unshift(endereco.complemento.trim());
  }

  const cep = formatarCep(endereco.cep);

  if (cep.trim()) {
    partes.push(cep);
  }

  if (endereco.isPrincipal) {
    partes.push("Principal");
  }

  return partes.join(" • ");
}

export function PagamentPage() {
  const [metodo, setMetodo] = useState("pix");
  const [freteSelecionado, setFreteSelecionado] = useState("padrao");
  const [enderecoForm, setEnderecoForm] = useState<EnderecoFormState>(
    criarEnderecoFormInicial(),
  );
  const [perfil, setPerfil] = useState<UsuarioPerfilApiResponse | null>(null);
  const [enderecosSalvos, setEnderecosSalvos] = useState<EnderecoApiResponse[]>([]);
  const [enderecoSelecionadoId, setEnderecoSelecionadoId] = useState<number | null>(null);
  const [mostrarNovoEnderecoForm, setMostrarNovoEnderecoForm] = useState(false);
  const [tiposLogradouro, setTiposLogradouro] = useState<TipoLogradouroOption[]>(
    TIPOS_LOGRADOURO_FALLBACK,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [erro, setErro] = useState("");
  const { carrinhoItens, valorTotal, clearCart, estaAutenticado } = useCart();
  const navigate = useNavigate();

  const total = valorTotal;
  const temEnderecoSalvo = enderecosSalvos.length > 0;
  const enderecoSelecionado =
    enderecosSalvos.find((endereco) => endereco.id === enderecoSelecionadoId) ??
    obterEnderecoPrincipal(enderecosSalvos);
  const tipoLogradouroPadrao =
    tiposLogradouro[0]?.codigo ?? ENDERECO_FORM_PADRAO.tipoLogradouro;

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
      setPerfil(null);
      setEnderecosSalvos([]);
      setEnderecoSelecionadoId(null);
      setMostrarNovoEnderecoForm(false);
      setEnderecoForm(criarEnderecoFormInicial(ENDERECO_FORM_PADRAO.tipoLogradouro));
      return () => {
        isMounted = false;
      };
    }

    async function carregarPerfil() {
      try {
        setErro("");

        const response = await obterPerfilUsuario();
        const [enderecosDetalhados, tiposResponse] = await Promise.all([
          listarEnderecos(response.id).catch(() => []),
          listarTiposLogradouro(response.id).catch(() => TIPOS_LOGRADOURO_FALLBACK),
        ]);

        if (!isMounted) {
          return;
        }

        const tiposDisponiveis =
          tiposResponse.length > 0 ? tiposResponse : TIPOS_LOGRADOURO_FALLBACK;
        const enderecosCarregados =
          enderecosDetalhados.length > 0
            ? enderecosDetalhados.filter((endereco) => endereco.ativo)
            : response.enderecos
                .map(mapearEnderecoPerfilParaDetalhe)
                .filter((endereco) => endereco.ativo);
        const enderecoPrincipal = obterEnderecoPrincipal(enderecosCarregados);

        setPerfil(response);
        setTiposLogradouro(tiposDisponiveis);
        setEnderecosSalvos(enderecosCarregados);
        setEnderecoSelecionadoId(enderecoPrincipal?.id ?? null);
        setMostrarNovoEnderecoForm(enderecosCarregados.length === 0);
        setEnderecoForm(
          criarEnderecoFormInicial(
            tiposDisponiveis[0]?.codigo ?? ENDERECO_FORM_PADRAO.tipoLogradouro,
            enderecosCarregados.length === 0,
          ),
        );
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

  function handleEnderecoChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target;

    setEnderecoForm((currentForm) => ({
      ...currentForm,
      [name]: name === "uf" ? value.toUpperCase() : value,
    }));
    setErro("");
  }

  function handleNovoEnderecoPrincipalChange(event: ChangeEvent<HTMLInputElement>) {
    const { checked } = event.target;

    setEnderecoForm((currentForm) => ({
      ...currentForm,
      isPrincipal: checked,
    }));
    setErro("");
  }

  function handleAdicionarEndereco() {
    setMostrarNovoEnderecoForm(true);
    setEnderecoForm(criarEnderecoFormInicial(tipoLogradouroPadrao, !temEnderecoSalvo));
    setErro("");
  }

  function handleCancelarNovoEndereco() {
    setMostrarNovoEnderecoForm(false);
    setEnderecoForm(criarEnderecoFormInicial(tipoLogradouroPadrao));
    setErro("");
  }

  function handleSelecionarEndereco(enderecoId: number) {
    setEnderecoSelecionadoId(enderecoId);
    setErro("");
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

  async function resolverEnderecoId() {
    const perfilAtual = perfil ?? (await obterPerfilUsuario());
    const enderecosDisponiveis =
      enderecosSalvos.length > 0
        ? enderecosSalvos
        : perfilAtual.enderecos
            .map(mapearEnderecoPerfilParaDetalhe)
            .filter((endereco) => endereco.ativo);
    const enderecoExistenteId =
      enderecoSelecionadoId ?? obterEnderecoPrincipal(enderecosDisponiveis)?.id;

    if (!mostrarNovoEnderecoForm) {
      return enderecoExistenteId;
    }

    if (!enderecoTemConteudo(enderecoForm)) {
      return enderecoExistenteId;
    }

    if (!enderecoEstaCompleto(enderecoForm)) {
      throw new Error(
        "Preencha tipo de logradouro, nome do endereco, CEP, cidade, numero e UF para usar um novo endereco.",
      );
    }

    const enderecoCriado = await criarEndereco(perfilAtual.id, {
      cep: normalizarCep(enderecoForm.cep),
      tipoLogradouro: enderecoForm.tipoLogradouro.trim(),
      nomeEndereco: enderecoForm.nomeEndereco.trim(),
      numero: enderecoForm.numero.trim(),
      complemento: enderecoForm.complemento.trim() || undefined,
      cidade: enderecoForm.cidade.trim(),
      uf: enderecoForm.uf.trim().toUpperCase(),
      isPrincipal: enderecoForm.isPrincipal,
    });

    const enderecosAtualizados = enderecoCriado.isPrincipal
      ? enderecosDisponiveis.map((endereco) => ({ ...endereco, isPrincipal: false }))
      : enderecosDisponiveis;
    const proximaLista = [...enderecosAtualizados, enderecoCriado];

    setEnderecosSalvos(proximaLista);
    setEnderecoSelecionadoId(enderecoCriado.id);
    setMostrarNovoEnderecoForm(false);
    setEnderecoForm(criarEnderecoFormInicial(tipoLogradouroPadrao));
    setPerfil((currentProfile) =>
      currentProfile
        ? {
            ...currentProfile,
            enderecos: [
              ...(enderecoCriado.isPrincipal
                ? currentProfile.enderecos.map((endereco) => ({
                    ...endereco,
                    isPrincipal: false,
                  }))
                : currentProfile.enderecos),
              {
                id: enderecoCriado.id,
                tipoLogradouro: enderecoCriado.tipoLogradouro,
                nomeEndereco: enderecoCriado.nomeEndereco,
                numero: enderecoCriado.numero,
                cep: enderecoCriado.cep,
                cidade: enderecoCriado.cidade,
                uf: enderecoCriado.uf,
                isPrincipal: enderecoCriado.isPrincipal,
                ativo: enderecoCriado.ativo,
              },
            ],
          }
        : currentProfile,
    );

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
        throw new Error("Cadastre ou selecione um endereco de entrega antes de continuar.");
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
              <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-yellow-400/80">
                    Etapa 1
                  </span>
                  <h2 className="text-2xl font-semibold text-white">Enderecos</h2>
                  <p className="max-w-2xl text-sm leading-6 text-zinc-400">
                    Revise os enderecos atuais e use o `+` para abrir mais um cadastro.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAdicionarEndereco}
                  disabled={mostrarNovoEnderecoForm}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${
                    mostrarNovoEnderecoForm
                      ? "cursor-not-allowed border-white/10 bg-white/5 text-neutral-600"
                      : "border-yellow-400/30 bg-yellow-400/10 text-yellow-300 hover:border-yellow-400/50 hover:bg-yellow-400/20"
                  }`}
                  aria-label="Adicionar endereco"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {temEnderecoSalvo ? (
                  enderecosSalvos.map((endereco, index) => {
                    const selecionado = enderecoSelecionado?.id === endereco.id;

                    return (
                      <label
                        key={endereco.id}
                        htmlFor={`endereco-salvo-${endereco.id}`}
                        className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition duration-200 hover:border-yellow-400/60 hover:bg-black/30 ${
                          selecionado
                            ? "border-yellow-400 bg-yellow-400/10 shadow-[0_0_0_1px_rgba(250,204,21,0.20)]"
                            : "border-white/10 bg-black/20"
                        }`}
                      >
                        <input
                          id={`endereco-salvo-${endereco.id}`}
                          type="radio"
                          name="endereco-salvo"
                          checked={selecionado}
                          onChange={() => handleSelecionarEndereco(endereco.id)}
                          className="mt-1 h-4 w-4 border-white/20 bg-transparent text-yellow-400 focus:ring-2 focus:ring-yellow-400/30"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                            <p className="font-semibold text-white">
                              {formatarResumoEndereco(endereco)}
                            </p>
                            <span className="text-xs text-zinc-500">Endereco {index + 1}</span>
                          </div>
                          <p className="mt-1 text-sm text-zinc-400">
                            {formatarDetalheEndereco(endereco)}
                          </p>
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-yellow-400/20 bg-yellow-400/5 px-4 py-5 text-sm text-zinc-300">
                    Nenhum endereco ativo foi encontrado no seu perfil. Cadastre o primeiro para
                    concluir a compra.
                  </div>
                )}

                {mostrarNovoEnderecoForm ? (
                  <div className="rounded-2xl border border-dashed border-yellow-400/25 bg-yellow-400/5 p-4">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <Plus className="h-4 w-4 text-yellow-400" />
                        <span>{temEnderecoSalvo ? "Novo endereco" : "Primeiro endereco"}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-200">
                          <input
                            type="checkbox"
                            checked={enderecoForm.isPrincipal}
                            onChange={handleNovoEnderecoPrincipalChange}
                            className="h-3.5 w-3.5 cursor-pointer accent-yellow-500"
                          />
                          Principal
                        </label>

                        {temEnderecoSalvo ? (
                          <button
                            type="button"
                            onClick={handleCancelarNovoEndereco}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-400/20 bg-red-400/10 text-red-300 transition hover:border-red-400/40 hover:bg-red-400/20"
                            aria-label="Remover novo endereco"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1">
                        <label htmlFor="tipoLogradouro" className="text-[#6b6b6b]">
                          Tipo de logradouro
                        </label>
                        <select
                          id="tipoLogradouro"
                          name="tipoLogradouro"
                          value={enderecoForm.tipoLogradouro}
                          onChange={handleEnderecoChange}
                          className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none transition focus:border-yellow-400"
                        >
                          {tiposLogradouro.map((tipo) => (
                            <option key={tipo.codigo} value={tipo.codigo}>
                              {tipo.descricao}
                            </option>
                          ))}
                        </select>
                      </div>

                      <Input
                        id="nomeEndereco"
                        name="nomeEndereco"
                        label="Nome do endereco"
                        placeholder="Rua Flor de ouro"
                        value={enderecoForm.nomeEndereco}
                        onChange={handleEnderecoChange}
                        className="h-12 rounded-2xl border-white/10 bg-black/40 px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                      />
                      <Input
                        id="numero"
                        name="numero"
                        label="Numero"
                        placeholder="249"
                        inputMode="numeric"
                        value={enderecoForm.numero}
                        onChange={handleEnderecoChange}
                        className="h-12 rounded-2xl border-white/10 bg-black/40 px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                      />
                      <Input
                        id="complemento"
                        name="complemento"
                        label="Complemento"
                        placeholder="Apto 12"
                        value={enderecoForm.complemento}
                        onChange={handleEnderecoChange}
                        className="h-12 rounded-2xl border-white/10 bg-black/40 px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                      />
                      <Input
                        id="cep"
                        name="cep"
                        label="CEP"
                        placeholder="02281-010"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        value={enderecoForm.cep}
                        onChange={handleEnderecoChange}
                        className="h-12 rounded-2xl border-white/10 bg-black/40 px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                      />
                      <Input
                        id="cidade"
                        name="cidade"
                        label="Cidade"
                        placeholder="Sao Paulo"
                        autoComplete="address-level2"
                        value={enderecoForm.cidade}
                        onChange={handleEnderecoChange}
                        className="h-12 rounded-2xl border-white/10 bg-black/40 px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                      />
                      <Input
                        id="uf"
                        name="uf"
                        label="UF"
                        placeholder="SP"
                        autoComplete="address-level1"
                        maxLength={2}
                        value={enderecoForm.uf}
                        onChange={handleEnderecoChange}
                        className="h-12 rounded-2xl border-white/10 bg-black/40 px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                      />
                    </div>

                    {temEnderecoSalvo ? (
                      <p className="mt-4 text-sm text-zinc-400">
                        Se voce fechar este formulario, o checkout volta a usar o endereco
                        selecionado acima.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
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
