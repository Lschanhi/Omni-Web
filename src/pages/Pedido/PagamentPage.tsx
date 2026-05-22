import { useEffect, useState, type ChangeEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { PageLayout } from "../../Components/PageLayout";
import { Input } from "../../Components/Input";
import { useCart } from "../../context/CartContext";
import {
  criarEndereco,
  listarEnderecos,
  listarTiposLogradouro,
  removerEndereco,
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
import {
  listarEntregasPublicasLoja,
  type LojaEntregaFiltro,
  type LojaEntregaOpcao,
} from "../../Services/produtos/lojaEntregaService";

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

type EnderecoExibicao = EnderecoApiResponse & {
  assinatura: string;
  idsAgrupados: number[];
};

type EtapaCheckout = "enderecos" | "entrega" | "pagamento";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

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

function normalizarTextoEndereco(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function criarAssinaturaEndereco(endereco: EnderecoApiResponse) {
  return [
    normalizarTextoEndereco(endereco.tipoLogradouro),
    normalizarTextoEndereco(endereco.nomeEndereco),
    normalizarTextoEndereco(endereco.numero),
    normalizarTextoEndereco(endereco.complemento),
    normalizarTextoEndereco(endereco.cep),
    normalizarTextoEndereco(endereco.cidade),
    normalizarTextoEndereco(endereco.uf),
  ].join("|");
}

function agruparEnderecos(enderecos: EnderecoApiResponse[]) {
  const agrupados = new Map<string, EnderecoExibicao>();

  for (const endereco of enderecos) {
    const assinatura = criarAssinaturaEndereco(endereco);
    const existente = agrupados.get(assinatura);

    if (!existente) {
      agrupados.set(assinatura, {
        ...endereco,
        assinatura,
        idsAgrupados: [endereco.id],
      });
      continue;
    }

    existente.idsAgrupados.push(endereco.id);
    existente.isPrincipal = existente.isPrincipal || endereco.isPrincipal;
    existente.ativo = existente.ativo || endereco.ativo;

    if ((!existente.complemento || !existente.complemento.trim()) && endereco.complemento?.trim()) {
      existente.complemento = endereco.complemento;
    }

    if (endereco.isPrincipal) {
      existente.id = endereco.id;
    }
  }

  return Array.from(agrupados.values());
}

function obterEnderecoPrincipal<T extends { isPrincipal: boolean }>(enderecos: T[]) {
  return enderecos.find((endereco) => endereco.isPrincipal) ?? enderecos[0] ?? null;
}

function formatarResumoEndereco(endereco: EnderecoExibicao) {
  return `${endereco.tipoLogradouro} ${endereco.nomeEndereco}, ${endereco.numero}`;
}

function formatarDetalheEndereco(endereco: EnderecoExibicao) {
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

  return partes.join(" - ");
}

function limparTextoOpcional(value: string | null | undefined) {
  const texto = (value ?? "").trim();
  return texto || undefined;
}

function criarFiltroEntrega(
  enderecoSelecionado: EnderecoExibicao | null,
  mostrarNovoEnderecoForm: boolean,
  enderecoForm: EnderecoFormState,
): LojaEntregaFiltro {
  if (mostrarNovoEnderecoForm && enderecoTemConteudo(enderecoForm)) {
    return {
      cep: limparTextoOpcional(normalizarCep(enderecoForm.cep)),
      cidade: limparTextoOpcional(enderecoForm.cidade),
      uf: limparTextoOpcional(enderecoForm.uf)?.toUpperCase(),
    };
  }

  if (!enderecoSelecionado) {
    return {};
  }

  return {
    cep: limparTextoOpcional(normalizarCep(enderecoSelecionado.cep)),
    cidade: limparTextoOpcional(enderecoSelecionado.cidade),
    uf: limparTextoOpcional(enderecoSelecionado.uf)?.toUpperCase(),
  };
}

function formatarMoeda(valor: number) {
  return currencyFormatter.format(valor);
}

function formatarPrazoEntrega(prazoEntregaDias: number) {
  if (prazoEntregaDias <= 0) {
    return "Disponivel imediatamente";
  }

  if (prazoEntregaDias === 1) {
    return "Receba em ate 1 dia util";
  }

  return `Receba em ate ${prazoEntregaDias} dias uteis`;
}

function criarImagemResumoPlaceholder(label: string) {
  const titulo = label.trim().slice(0, 20) || "OmniMarket";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#111827" />
        </linearGradient>
      </defs>
      <rect width="320" height="320" rx="32" fill="url(#bg)" />
      <circle cx="250" cy="78" r="54" fill="rgba(255,255,255,0.12)" />
      <circle cx="84" cy="236" r="72" fill="rgba(0,0,0,0.16)" />
      <text x="28" y="166" fill="#ffffff" font-family="Arial, sans-serif" font-size="24" font-weight="700">
        ${titulo}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function PagamentPage() {
  const [metodo, setMetodo] = useState("pix");
  const [etapaAberta, setEtapaAberta] = useState<EtapaCheckout | null>("enderecos");
  const [freteSelecionadoId, setFreteSelecionadoId] = useState<number | null>(null);
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
  const [opcoesEntrega, setOpcoesEntrega] = useState<LojaEntregaOpcao[]>([]);
  const [isLoadingEntregas, setIsLoadingEntregas] = useState(false);
  const [erroEntrega, setErroEntrega] = useState("");
  const [isRemovingAddress, setIsRemovingAddress] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [erro, setErro] = useState("");
  const { carrinhoItens, valorTotal, clearCart, estaAutenticado } = useCart();
  const navigate = useNavigate();

  const subtotal = valorTotal;
  const enderecosExibidos = agruparEnderecos(enderecosSalvos);
  const temEnderecoSalvo = enderecosExibidos.length > 0;
  const enderecoSelecionado =
    enderecosExibidos.find((endereco) => endereco.id === enderecoSelecionadoId) ??
    obterEnderecoPrincipal(enderecosExibidos);
  const tipoLogradouroPadrao =
    tiposLogradouro[0]?.codigo ?? ENDERECO_FORM_PADRAO.tipoLogradouro;
  const lojasCarrinho = Array.from(
    new Set(
      carrinhoItens
        .map((item) => item.lojaId)
        .filter((lojaId): lojaId is number => typeof lojaId === "number" && lojaId > 0),
    ),
  );
  const carrinhoTemMultiplasLojas = lojasCarrinho.length > 1;
  const lojaCheckoutId = lojasCarrinho[0] ?? null;
  const filtroEntrega = criarFiltroEntrega(
    enderecoSelecionado,
    mostrarNovoEnderecoForm,
    enderecoForm,
  );
  const filtroEntregaCep = filtroEntrega.cep ?? "";
  const filtroEntregaCidade = filtroEntrega.cidade ?? "";
  const filtroEntregaUf = filtroEntrega.uf ?? "";
  const opcaoEntregaSelecionada =
    opcoesEntrega.find((opcao) => opcao.id === freteSelecionadoId) ?? null;
  const valorFreteSelecionado = opcaoEntregaSelecionada?.valorFrete ?? 0;
  const total = subtotal + valorFreteSelecionado;

  function alternarEtapa(etapa: EtapaCheckout) {
    setEtapaAberta((currentEtapa) => (currentEtapa === etapa ? null : etapa));
  }

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
        const enderecosCarregadosBrutos =
          enderecosDetalhados.length > 0
            ? enderecosDetalhados.filter((endereco) => endereco.ativo)
            : response.enderecos
                .map(mapearEnderecoPerfilParaDetalhe)
                .filter((endereco) => endereco.ativo);
        const enderecosCarregados = agruparEnderecos(enderecosCarregadosBrutos);
        const enderecoPrincipal = obterEnderecoPrincipal(enderecosCarregados);

        setPerfil(response);
        setTiposLogradouro(tiposDisponiveis);
        setEnderecosSalvos(enderecosCarregadosBrutos);
        setEnderecoSelecionadoId(enderecoPrincipal?.id ?? null);
        setMostrarNovoEnderecoForm(enderecosCarregadosBrutos.length === 0);
        setEnderecoForm(
          criarEnderecoFormInicial(
            tiposDisponiveis[0]?.codigo ?? ENDERECO_FORM_PADRAO.tipoLogradouro,
            enderecosCarregadosBrutos.length === 0,
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

  useEffect(() => {
    let isMounted = true;

    if (carrinhoItens.length === 0) {
      setOpcoesEntrega([]);
      setFreteSelecionadoId(null);
      setErroEntrega("");
      setIsLoadingEntregas(false);
      return () => {
        isMounted = false;
      };
    }

    if (carrinhoTemMultiplasLojas) {
      setOpcoesEntrega([]);
      setFreteSelecionadoId(null);
      setErroEntrega(
        "O checkout atual calcula frete para uma loja por vez. Deixe itens de uma unica loja no carrinho para selecionar a entrega.",
      );
      setIsLoadingEntregas(false);
      return () => {
        isMounted = false;
      };
    }

    if (!lojaCheckoutId) {
      setOpcoesEntrega([]);
      setFreteSelecionadoId(null);
      setErroEntrega("Nao foi possivel identificar a loja dos itens do carrinho.");
      setIsLoadingEntregas(false);
      return () => {
        isMounted = false;
      };
    }

    async function carregarEntregas() {
      try {
        setIsLoadingEntregas(true);
        setErroEntrega("");

        const response = await listarEntregasPublicasLoja(lojaCheckoutId, {
          cep: filtroEntregaCep || undefined,
          cidade: filtroEntregaCidade || undefined,
          uf: filtroEntregaUf || undefined,
        });

        if (!isMounted) {
          return;
        }

        setOpcoesEntrega(response);
        setFreteSelecionadoId((currentId) => {
          if (currentId && response.some((opcao) => opcao.id === currentId)) {
            return currentId;
          }

          return response.find((opcao) => opcao.tipoEntregaId)?.id ?? response[0]?.id ?? null;
        });

        if (response.length === 0) {
          setErroEntrega("Esta loja ainda nao configurou opcoes de entrega para o checkout.");
        } else if (!response.some((opcao) => opcao.tipoEntregaId)) {
          setErroEntrega(
            "As opcoes de entrega desta loja ainda nao possuem um tipo compativel com o checkout atual.",
          );
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setOpcoesEntrega([]);
        setFreteSelecionadoId(null);
        setErroEntrega(
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar as opcoes de entrega da loja.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingEntregas(false);
        }
      }
    }

    void carregarEntregas();

    return () => {
      isMounted = false;
    };
  }, [
    carrinhoItens.length,
    carrinhoTemMultiplasLojas,
    lojaCheckoutId,
    filtroEntregaCep,
    filtroEntregaCidade,
    filtroEntregaUf,
  ]);

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
    setEtapaAberta("enderecos");
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

  async function handleRemoverEndereco(endereco: EnderecoExibicao) {
    if (!perfil || isRemovingAddress || isSubmitting) {
      return;
    }

    try {
      setIsRemovingAddress(endereco.id);
      setErro("");

      await Promise.all(
        endereco.idsAgrupados.map((enderecoId) => removerEndereco(perfil.id, enderecoId)),
      );

      const proximaLista = enderecosSalvos.filter(
        (item) => !endereco.idsAgrupados.includes(item.id),
      );
      const proximosEnderecosExibidos = agruparEnderecos(proximaLista);
      const proximoSelecionado =
        enderecoSelecionadoId && endereco.idsAgrupados.includes(enderecoSelecionadoId)
          ? obterEnderecoPrincipal(proximosEnderecosExibidos)?.id ?? null
          : enderecoSelecionadoId;

      setEnderecosSalvos(proximaLista);
      setEnderecoSelecionadoId(proximoSelecionado);
      setPerfil((currentProfile) =>
        currentProfile
          ? {
              ...currentProfile,
              enderecos: currentProfile.enderecos.filter(
                (item) => !endereco.idsAgrupados.includes(item.id),
              ),
            }
          : currentProfile,
      );

      if (proximosEnderecosExibidos.length === 0) {
        setMostrarNovoEnderecoForm(true);
        setEnderecoForm(criarEnderecoFormInicial(tipoLogradouroPadrao, true));
      }
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Nao foi possivel remover o endereco.",
      );
    } finally {
      setIsRemovingAddress(null);
    }
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

    if (carrinhoTemMultiplasLojas) {
      setErro(
        "O checkout atual aceita o calculo de frete para uma loja por vez. Ajuste o carrinho antes de continuar.",
      );
      return;
    }

    if (!opcaoEntregaSelecionada || !opcaoEntregaSelecionada.tipoEntregaId) {
      setErro("Selecione uma opcao de entrega valida antes de finalizar a compra.");
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
        tipoEntregaId: opcaoEntregaSelecionada.tipoEntregaId,
        observacao: "",
        itens: [],
      });

      const valorFreteFinal =
        Number(pedido.valorFrete) > 0 ? Number(pedido.valorFrete) : valorFreteSelecionado;
      const totalFinal = Number(pedido.valorProdutos) + valorFreteFinal;

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
            total: totalFinal,
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
              <div className="mb-6 border-b border-white/10 pb-5">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-yellow-400/80">
                  Resumo do pedido
                </span>
                <h2 className="mt-2 text-2xl font-semibold text-white">Produtos selecionados</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Confira os itens da compra antes de seguir para endereco, entrega e pagamento.
                </p>
              </div>

              <div className="space-y-4">
                {carrinhoItens.map((item) => (
                  <article
                    key={item.produtoId}
                    className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <img
                      src={item.imagem ?? criarImagemResumoPlaceholder(item.nome)}
                      alt={item.nome}
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = criarImagemResumoPlaceholder(item.nome);
                      }}
                      className="h-20 w-20 shrink-0 rounded-2xl border border-white/10 bg-black/30 object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-semibold text-white">{item.nome}</p>
                      <p className="mt-1 text-sm text-zinc-400">
                        Valor unitario: {formatarMoeda(item.preco)}
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">Quantidade: {item.quantidade}</p>
                      <p className="mt-2 text-sm font-semibold text-yellow-400">
                        Valor total: {formatarMoeda(item.subtotal)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-zinc-900/80 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:p-6">
              <div className="mb-6 flex gap-4 border-b border-white/10 pb-5">
                <button
                  type="button"
                  onClick={() => alternarEtapa("enderecos")}
                  className="flex flex-1 items-start justify-between gap-4 text-left"
                  aria-expanded={etapaAberta === "enderecos"}
                >
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-yellow-400/80">
                      Etapa 1
                    </span>
                    <h2 className="text-2xl font-semibold text-white">Enderecos</h2>
                    <p className="max-w-2xl text-sm leading-6 text-zinc-400">
                      Revise os enderecos atuais e use o `+` para abrir mais um cadastro.
                    </p>
                  </div>

                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 text-zinc-300 transition hover:border-yellow-400/40 hover:text-yellow-300">
                    {etapaAberta === "enderecos" ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleAdicionarEndereco}
                  disabled={mostrarNovoEnderecoForm}
                  className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition ${
                    mostrarNovoEnderecoForm
                      ? "cursor-not-allowed border-white/10 bg-white/5 text-neutral-600"
                      : "border-yellow-400/30 bg-yellow-400/10 text-yellow-300 hover:border-yellow-400/50 hover:bg-yellow-400/20"
                  }`}
                  aria-label="Adicionar endereco"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              {etapaAberta === "enderecos" ? (
                <div className="space-y-4">
                  {temEnderecoSalvo ? (
                    enderecosExibidos.map((endereco) => {
                      const selecionado = enderecoSelecionado?.id === endereco.id;

                      return (
                        <div
                          key={endereco.id}
                          className={`flex items-start gap-4 rounded-2xl border p-4 transition duration-200 hover:border-yellow-400/60 hover:bg-black/30 ${
                            selecionado
                              ? "border-yellow-400 bg-yellow-400/10 shadow-[0_0_0_1px_rgba(250,204,21,0.20)]"
                              : "border-white/10 bg-black/20"
                          }`}
                        >
                          <label
                            htmlFor={`endereco-salvo-${endereco.id}`}
                            className="flex min-w-0 flex-1 cursor-pointer items-start gap-4"
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
                              <p className="font-semibold text-white">
                                {formatarResumoEndereco(endereco)}
                              </p>
                              <p className="mt-1 text-sm text-zinc-400">
                                {formatarDetalheEndereco(endereco)}
                              </p>
                            </div>
                          </label>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleRemoverEndereco(endereco);
                            }}
                            disabled={isRemovingAddress === endereco.id}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-400/20 bg-red-400/10 text-red-300 transition hover:border-red-400/40 hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label="Remover endereco"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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
                              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-neutral-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                            >
                              Cancelar
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
                          value={enderecoForm.nomeEndereco}
                          onChange={handleEnderecoChange}
                          className="h-12 rounded-2xl border-white/10 bg-black/40 px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                        />
                        <Input
                          id="numero"
                          name="numero"
                          label="Numero"
                          inputMode="numeric"
                          value={enderecoForm.numero}
                          onChange={handleEnderecoChange}
                          className="h-12 rounded-2xl border-white/10 bg-black/40 px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                        />
                        <Input
                          id="complemento"
                          name="complemento"
                          label="Complemento"
                          value={enderecoForm.complemento}
                          onChange={handleEnderecoChange}
                          className="h-12 rounded-2xl border-white/10 bg-black/40 px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                        />
                        <Input
                          id="cep"
                          name="cep"
                          label="CEP"
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
                          autoComplete="address-level2"
                          value={enderecoForm.cidade}
                          onChange={handleEnderecoChange}
                          className="h-12 rounded-2xl border-white/10 bg-black/40 px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                        />
                        <Input
                          id="uf"
                          name="uf"
                          label="UF"
                          autoComplete="address-level1"
                          maxLength={2}
                          value={enderecoForm.uf}
                          onChange={handleEnderecoChange}
                          className="h-12 rounded-2xl border-white/10 bg-black/40 px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                        />
                      </div>

                      {temEnderecoSalvo ? (
                        <p className="mt-4 text-sm text-zinc-400">
                          Se voce cancelar este formulario, o checkout volta a usar o endereco
                          selecionado acima.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-white/10 bg-zinc-900/80 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:p-6">
              <button
                type="button"
                onClick={() => alternarEtapa("entrega")}
                className="mb-6 flex w-full items-start justify-between gap-4 border-b border-white/10 pb-5 text-left"
                aria-expanded={etapaAberta === "entrega"}
              >
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-yellow-400/80">
                    Etapa 2
                  </span>
                  <h2 className="text-2xl font-semibold text-white">Opcoes de entrega</h2>
                  <p className="text-sm leading-6 text-zinc-400">
                    Escolha a modalidade que melhor se encaixa no seu prazo e preferencia.
                  </p>
                </div>

                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 text-zinc-300 transition hover:border-yellow-400/40 hover:text-yellow-300">
                  {etapaAberta === "entrega" ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </span>
              </button>

              {etapaAberta === "entrega" ? (
                <fieldset className="space-y-4">
                  <div className="grid gap-3">
                  {isLoadingEntregas ? (
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-zinc-300">
                      Carregando opcoes de entrega da loja...
                    </div>
                  ) : null}

                  {!isLoadingEntregas && erroEntrega ? (
                    <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 px-4 py-5 text-sm text-zinc-300">
                      {erroEntrega}
                    </div>
                  ) : null}

                  {!isLoadingEntregas && !erroEntrega
                    ? opcoesEntrega.map((opcao) => {
                        const selecionado = freteSelecionadoId === opcao.id;

                        return (
                          <label
                            key={opcao.id}
                            htmlFor={`frete-${opcao.id}`}
                            className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition duration-200 hover:border-yellow-400/60 hover:bg-black/30 ${
                              selecionado
                                ? "border-yellow-400 bg-yellow-400/10 shadow-[0_0_0_1px_rgba(250,204,21,0.20)]"
                                : "border-white/10 bg-black/20"
                            }`}
                          >
                            <input
                              id={`frete-${opcao.id}`}
                              type="radio"
                              name="frete"
                              checked={selecionado}
                              onChange={() => setFreteSelecionadoId(opcao.id)}
                              className="mt-1 h-4 w-4 border-white/20 bg-transparent text-yellow-400 focus:ring-2 focus:ring-yellow-400/30"
                            />

                            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-semibold text-white">{opcao.nome}</p>
                                <p className="text-sm text-zinc-400">
                                  {opcao.tipoEntrega} • {formatarPrazoEntrega(opcao.prazoEntregaDias)}
                                </p>
                                {opcao.observacao?.trim() ? (
                                  <p className="mt-1 text-xs text-zinc-500">
                                    {opcao.observacao.trim()}
                                  </p>
                                ) : null}
                              </div>
                              <span className="text-sm font-semibold text-yellow-400">
                                {formatarMoeda(opcao.valorFrete)}
                              </span>
                            </div>
                          </label>
                        );
                      })
                    : null}
                  </div>
                </fieldset>
              ) : null}
            </section>

            <section className="rounded-2xl border border-white/10 bg-zinc-900/80 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:p-6">
              <button
                type="button"
                onClick={() => alternarEtapa("pagamento")}
                className="mb-6 flex w-full items-start justify-between gap-4 border-b border-white/10 pb-5 text-left"
                aria-expanded={etapaAberta === "pagamento"}
              >
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-yellow-400/80">
                    Etapa 3
                  </span>
                  <h2 className="text-2xl font-semibold text-white">Forma de pagamento</h2>
                  <p className="text-sm leading-6 text-zinc-400">
                    Selecione a forma de pagamento desejada para concluir seu checkout.
                  </p>
                </div>

                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 text-zinc-300 transition hover:border-yellow-400/40 hover:text-yellow-300">
                  {etapaAberta === "pagamento" ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </span>
              </button>

              {etapaAberta === "pagamento" ? (
                <>
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

                  {metodo === "debito" ? (
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
                </>
              ) : null}
            </section>
          </div>

          <div className="lg:col-span-1 lg:self-start">
            <aside className="space-y-4 rounded-2xl border border-white/10 p-5 lg:sticky lg:top-28">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl font-semibold">Totais do pedido</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Este bloco acompanha a rolagem para voce revisar subtotal, frete e total a
                  qualquer momento.
                </p>
              </div>

              <div className="pt-1">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-zinc-300">
                    <span>Subtotal</span>
                    <span>{formatarMoeda(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-zinc-300">
                    <span>Frete</span>
                    <span>
                      {isLoadingEntregas ? "Calculando..." : formatarMoeda(valorFreteSelecionado)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex text-[30px] font-bold">
                  <p className="px-3">Total:</p>
                  <p className="text-emerald-300">{formatarMoeda(total)}</p>
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
                disabled={
                  isSubmitting ||
                  isLoadingEntregas ||
                  !estaAutenticado ||
                  carrinhoItens.length === 0 ||
                  !opcaoEntregaSelecionada
                }
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
