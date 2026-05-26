import { useEffect, useState } from "react";
import type {
  PerfilPedidoStatusFluxo,
  PerfilGridItem,
  PerfilPageState,
  PerfilTabId,
  PerfilVendaStatusItem,
  UsuarioEnderecoPerfil,
  UsuarioPerfil,
  UsuarioTelefonePerfil,
  UsuarioStatsData,
} from "../types/perfil";
import type { HomeProduct } from "../types/home";
import {
  AUTH_CHANGED_EVENT,
  getStoredUser,
  isAuthenticated,
  updateStoredUser,
} from "../Services/auth/session";
import {
  criarImagemPlaceholder,
  listarProdutos,
  obterProdutoPorId,
} from "../Services/produtos/produtoService";
import { listarEnderecos } from "../Services/user/enderecoService";
import { obterMinhaLoja, type LojaGestaoApiResponse } from "../Services/user/lojaService";
import { formatarTelefoneParaExibicao } from "../Services/user/telefoneService";
import {
  listarPedidosUsuario,
  obterMinhasMetricasLoja,
  obterPerfilUsuario,
  type LojaMetricasApiResponse,
  type PedidoLeituraApiResponse,
  type UsuarioPerfilApiResponse,
} from "../Services/user/usuarioService";

const INITIAL_STATE: PerfilPageState = {
  isUsuarioLoading: true,
  isConteudoLoading: true,
  usuarioError: "",
  conteudoError: "",
};

const INITIAL_STATS: UsuarioStatsData = {
  avaliacaoMedia: 0,
  seguidores: 0,
  totalProdutos: 0,
  totalVendas: 0,
  totalCompras: 0,
  faturamentoBruto: 0,
  ticketMedio: 0,
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const FLUXO_VENDAS_BASE: PerfilVendaStatusItem[] = [
  {
    key: "em-separacao",
    label: "Em separacao",
    total: 0,
    descricao: "Pedidos pagos que entraram na fila operacional da loja.",
  },
  {
    key: "pronto",
    label: "Pronto",
    total: 0,
    descricao: "Itens separados e liberados para expedicao ou retirada.",
  },
  {
    key: "enviado",
    label: "Enviado",
    total: 0,
    descricao: "Pedidos que ja sairam da loja e estao em transporte.",
  },
  {
    key: "finalizado",
    label: "Finalizado",
    total: 0,
    descricao: "Vendas concluidas com entrega ou recebimento confirmado.",
  },
];

function formatarEndereco(endereco: UsuarioPerfilApiResponse["enderecos"][number] | undefined) {
  if (!endereco) {
    return "";
  }

  return `${endereco.tipoLogradouro} ${endereco.nomeEndereco}, ${endereco.numero} - ${endereco.cidade}/${endereco.uf}`;
}

function normalizarTextoBase(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function mapearTelefones(perfil: UsuarioPerfilApiResponse): UsuarioTelefonePerfil[] {
  return perfil.telefones.map((telefone) => ({
    id: telefone.id,
    numero: formatarTelefoneParaExibicao(telefone.numeroE164),
    isPrincipal: telefone.isPrincipal,
  }));
}

function mapearEnderecos(
  perfil: UsuarioPerfilApiResponse,
  enderecosDetalhados: Awaited<ReturnType<typeof listarEnderecos>>,
): UsuarioEnderecoPerfil[] {
  const enderecosDetalhadosPorId = new Map(
    enderecosDetalhados.map((endereco) => [endereco.id, endereco]),
  );

  return perfil.enderecos.map((endereco) => {
    const detalhe = enderecosDetalhadosPorId.get(endereco.id);

    return {
      id: endereco.id,
      tipoLogradouro: endereco.tipoLogradouro,
      tipoLogradouroDescricao: detalhe?.tipoLogradouro ?? endereco.tipoLogradouro,
      nomeEndereco: endereco.nomeEndereco,
      numero: endereco.numero,
      complemento: detalhe?.complemento ?? "",
      cep: endereco.cep,
      cidade: endereco.cidade,
      uf: endereco.uf,
      isPrincipal: endereco.isPrincipal,
      ativo: endereco.ativo,
    };
  });
}

function mapearUsuario(
  perfil: UsuarioPerfilApiResponse,
  telefones: UsuarioTelefonePerfil[],
  enderecos: UsuarioEnderecoPerfil[],
): UsuarioPerfil {
  const telefonePrincipal = telefones.find((telefone) => telefone.isPrincipal) ?? telefones[0];
  const enderecoPrincipal = enderecos.find((endereco) => endereco.isPrincipal) ?? enderecos[0];

  return {
    id: perfil.id,
    nome: `${perfil.nome} ${perfil.sobrenome}`.trim(),
    primeiroNome: perfil.nome,
    sobrenome: perfil.sobrenome,
    email: perfil.email,
    telefone: telefonePrincipal?.numero ?? "",
    telefones,
    telefonePrincipalId: telefonePrincipal?.id,
    endereco: formatarEndereco(
      enderecoPrincipal
        ? {
            id: enderecoPrincipal.id,
            tipoLogradouro: enderecoPrincipal.tipoLogradouro,
            nomeEndereco: enderecoPrincipal.nomeEndereco,
            numero: enderecoPrincipal.numero,
            cep: enderecoPrincipal.cep,
            cidade: enderecoPrincipal.cidade,
            uf: enderecoPrincipal.uf,
            isPrincipal: enderecoPrincipal.isPrincipal,
            ativo: enderecoPrincipal.ativo,
          }
        : undefined,
    ),
    enderecos,
    enderecoPrincipalId: enderecoPrincipal?.id,
    avatarUrl: perfil.avatarUrl ?? undefined,
    contaVerificada: true,
  };
}

function isImagemPlaceholder(url: string | undefined) {
  return Boolean(url && /^data:image\/svg\+xml/i.test(url));
}

function produtoTemImagemUtil(produto: HomeProduct | undefined) {
  if (!produto) {
    return false;
  }

  const fontes = [produto.imagem, ...(produto.imagens ?? [])].filter(
    (fonte): fonte is string => typeof fonte === "string" && fonte.trim().length > 0,
  );

  return fontes.some((fonte) => !isImagemPlaceholder(fonte));
}

function combinarProdutos(base: HomeProduct[], extras: Array<HomeProduct | null>) {
  const produtosPorId = new Map(base.map((produto) => [produto.id, produto]));

  extras.forEach((produto) => {
    if (produto) {
      produtosPorId.set(produto.id, produto);
    }
  });

  return Array.from(produtosPorId.values());
}

function resolverChaveFluxoVenda(status: string) {
  const statusNormalizado = normalizarTextoBase(status.trim());

  if (!statusNormalizado) {
    return null;
  }

  if (
    [
      "pago",
      "pagamento confirmado",
      "confirmado",
      "em separacao",
      "separacao",
      "separando",
      "processando",
      "em preparo",
    ].includes(statusNormalizado)
  ) {
    return "em-separacao" as const;
  }

  if (
    [
      "pronto",
      "pronto para envio",
      "pronto para retirada",
      "embalado",
    ].includes(statusNormalizado)
  ) {
    return "pronto" as const;
  }

  if (
    [
      "enviado",
      "em transito",
      "saiu para entrega",
      "transportando",
      "despachado",
    ].includes(statusNormalizado)
  ) {
    return "enviado" as const;
  }

  if (
    [
      "cancelado",
      "cancelada",
      "cancelamento solicitado",
      "pedido cancelado",
      "cancelado pelo vendedor",
    ].includes(statusNormalizado)
  ) {
    return "cancelado" as const;
  }

  if (
    [
      "finalizado",
      "entregue",
      "concluido",
      "recebido",
      "retirado",
    ].includes(statusNormalizado)
  ) {
    return "finalizado" as const;
  }

  return null;
}

function normalizarStatusFluxoVenda(status: string): PerfilPedidoStatusFluxo {
  return resolverChaveFluxoVenda(status) ?? "em-separacao";
}

function criarRotuloStatusFluxoVenda(status: PerfilPedidoStatusFluxo) {
  switch (status) {
    case "pronto":
      return "Pronto";
    case "enviado":
      return "Enviado";
    case "finalizado":
      return "Finalizado";
    case "cancelado":
      return "Cancelado";
    case "em-separacao":
    default:
      return "Em separacao";
  }
}

function criarFluxoStatusVendas(metricas: LojaMetricasApiResponse | null): PerfilVendaStatusItem[] {
  const fluxo = FLUXO_VENDAS_BASE.map((item) => ({ ...item }));

  metricas?.pedidosPorStatus.forEach((itemStatus) => {
    const chave = resolverChaveFluxoVenda(itemStatus.status);

    if (!chave) {
      return;
    }

    const etapa = fluxo.find((item) => item.key === chave);

    if (etapa) {
      etapa.total += itemStatus.total;
    }
  });

  return fluxo;
}

function formatarDataPedido(dataPedido: string) {
  const data = new Date(dataPedido);

  if (Number.isNaN(data.getTime())) {
    return dataPedido;
  }

  return dateTimeFormatter.format(data);
}

function formatarEnderecoEntrega(pedido: PedidoLeituraApiResponse) {
  const partes = [
    `${pedido.tipoLogradouroEntrega} ${pedido.nomeEnderecoEntrega}, ${pedido.numeroEntrega}`,
    pedido.complementoEntrega?.trim() || "",
    `${pedido.cidadeEntrega}/${pedido.ufEntrega}`,
    `CEP ${pedido.cepEntrega}`,
  ].filter(Boolean);

  return partes.join(" - ");
}

function mapearItensPedido(
  pedido: PedidoLeituraApiResponse,
  produtosPorId: Map<number, HomeProduct>,
) {
  return pedido.itens.map((item) => {
    const produto = produtosPorId.get(item.produtoId);
    const imagens = produto?.imagens?.filter(Boolean) ?? [];
    const imagemPrincipal =
      produto?.imagem || imagens[0] || criarImagemPlaceholder(item.nomeProduto);
    const imagensDisponiveis = imagens.length > 0 ? imagens : [imagemPrincipal];

    return {
      id: item.id,
      produtoId: item.produtoId,
      nomeProduto: item.nomeProduto,
      skuProduto: item.skuProduto,
      lojaId: item.lojaId,
      nomeLoja: produto?.lojaNome?.trim() || item.nomeLoja,
      quantidade: item.quantidade,
      precoUnitario: currencyFormatter.format(Number(item.precoUnitario)),
      valorTotal: currencyFormatter.format(Number(item.valorTotal)),
      descricao:
        produto?.descricao?.trim() ||
        "Produto comprado neste pedido. A descricao detalhada ainda nao foi enviada pela API.",
      imagemUrl: imagemPrincipal,
      imagens: imagensDisponiveis,
    };
  });
}

function mapearCompras(
  pedidos: PedidoLeituraApiResponse[],
  produtos: HomeProduct[],
): PerfilGridItem[] {
  const produtosPorId = new Map(produtos.map((produto) => [produto.id, produto]));

  return pedidos.map((pedido) => {
    const itensDetalhados = mapearItensPedido(pedido, produtosPorId);
    const itemPrincipal = itensDetalhados[0];
    const resumoItens = itensDetalhados
      .slice(0, 2)
      .map((item) => `${item.quantidade}x ${item.nomeProduto}`)
      .join(" | ");
    const descricaoPedido =
      pedido.observacao?.trim() ||
      resumoItens ||
      "Abra o pedido para visualizar os itens, a entrega e as opcoes de acompanhamento.";

    return {
      id: `pedido-${pedido.id}`,
      titulo: `Pedido #${pedido.id}`,
      subtitulo: `${pedido.status} - ${pedido.tipoEntrega}`,
      valor: currencyFormatter.format(Number(pedido.valorTotalPedido)),
      imagemUrl: itemPrincipal?.imagemUrl,
      imagens: itemPrincipal?.imagens,
      badge: itemPrincipal?.nomeLoja ?? pedido.itens[0]?.nomeLoja ?? undefined,
      descricao: descricaoPedido,
      pedido: {
        pedidoId: pedido.id,
        contexto: "compra",
        status: pedido.status,
        statusFluxoKey: normalizarStatusFluxoVenda(pedido.status),
        tipoEntrega: pedido.tipoEntrega,
        dataPedido: formatarDataPedido(pedido.dataPedido),
        observacao:
          pedido.observacao?.trim() ||
          "Sem observacoes adicionais informadas para este pedido.",
        enderecoEntrega: formatarEnderecoEntrega(pedido),
        subtotal: currencyFormatter.format(Number(pedido.valorTotalProdutos)),
        frete: currencyFormatter.format(Number(pedido.valorFrete)),
        total: currencyFormatter.format(Number(pedido.valorTotalPedido)),
        itens: itensDetalhados,
      },
    };
  });
}

function mapearVendas(
  pedidos: PedidoLeituraApiResponse[],
  produtos: HomeProduct[],
  lojaId?: number | null,
): PerfilGridItem[] {
  if (pedidos.length === 0) {
    return [];
  }

  const produtosPorId = new Map(produtos.map((produto) => [produto.id, produto]));
  const pedidosRelacionados =
    lojaId && Number.isFinite(lojaId)
      ? pedidos.filter((pedido) => pedido.itens.some((item) => item.lojaId === lojaId))
      : pedidos;
  const pedidosBase = pedidosRelacionados.length > 0 ? pedidosRelacionados : pedidos;

  return pedidosBase.map((pedido) => {
    const itensDaLoja =
      lojaId && Number.isFinite(lojaId)
        ? pedido.itens.filter((item) => item.lojaId === lojaId)
        : pedido.itens;
    const itensFiltrados = itensDaLoja.length > 0 ? itensDaLoja : pedido.itens;
    const pedidoDaLoja = {
      ...pedido,
      itens: itensFiltrados,
    };
    const itensDetalhados = mapearItensPedido(pedidoDaLoja, produtosPorId);
    const itemPrincipal = itensDetalhados[0];
    const subtotalNumerico = itensFiltrados.reduce(
      (acumulador, item) => acumulador + Number(item.valorTotal),
      0,
    );
    const totalNumerico =
      itensFiltrados.length === pedido.itens.length
        ? Number(pedido.valorTotalPedido)
        : subtotalNumerico + Number(pedido.valorFrete);
    const totalItens = itensFiltrados.reduce(
      (acumulador, item) => acumulador + Number(item.quantidade),
      0,
    );
    const statusFluxoKey = normalizarStatusFluxoVenda(pedido.status);
    const statusRotulo = criarRotuloStatusFluxoVenda(statusFluxoKey);
    const resumoItens = itensDetalhados
      .slice(0, 2)
      .map((item) => `${item.quantidade}x ${item.nomeProduto}`)
      .join(" | ");
    const descricaoPedido =
      pedido.observacao?.trim() ||
      resumoItens ||
      "Abra o pedido para ver os itens, a entrega e as acoes do fluxo da venda.";

    return {
      id: `venda-pedido-${pedido.id}`,
      titulo: `Pedido #${pedido.id}`,
      subtitulo: `${statusRotulo} - ${pedido.tipoEntrega}`,
      valor: currencyFormatter.format(totalNumerico),
      imagemUrl: itemPrincipal?.imagemUrl,
      imagens: itemPrincipal?.imagens,
      descricao: descricaoPedido,
      badge: totalItens > 1 ? `${totalItens} itens` : "1 item",
      pedido: {
        pedidoId: pedido.id,
        contexto: "venda",
        status: statusRotulo,
        statusFluxoKey,
        tipoEntrega: pedido.tipoEntrega,
        dataPedido: formatarDataPedido(pedido.dataPedido),
        observacao:
          pedido.observacao?.trim() ||
          "Sem observacoes adicionais informadas para este pedido.",
        enderecoEntrega: formatarEnderecoEntrega(pedido),
        subtotal: currencyFormatter.format(subtotalNumerico),
        frete: currencyFormatter.format(Number(pedido.valorFrete)),
        total: currencyFormatter.format(totalNumerico),
        itens: itensDetalhados,
      },
    };
  });
}

function mapearStats(
  metricas: LojaMetricasApiResponse | null,
  totalCompras: number,
  totalProdutos: number,
): UsuarioStatsData {
  return {
    avaliacaoMedia: metricas?.mediaAvaliacao ?? 0,
    seguidores: 0,
    totalProdutos,
    totalVendas:
      metricas?.pedidosPorStatus.reduce((acumulador, item) => acumulador + item.total, 0) ?? 0,
    totalCompras,
    faturamentoBruto: Number(metricas?.faturamentoBruto ?? 0),
    ticketMedio: Number(metricas?.ticketMedio ?? 0),
  };
}

function sincronizarSessaoComPerfil(perfil: UsuarioPerfilApiResponse) {
  const usuarioSessao = getStoredUser();

  if (!usuarioSessao) {
    return;
  }

  const nomeCompleto = `${perfil.nome} ${perfil.sobrenome}`.trim();
  const avatarUrl = perfil.avatarUrl ?? null;

  if (
    usuarioSessao.nome === nomeCompleto &&
    usuarioSessao.email === perfil.email &&
    (usuarioSessao.avatarUrl ?? null) === avatarUrl
  ) {
    return;
  }

  updateStoredUser({
    ...usuarioSessao,
    nome: nomeCompleto,
    email: perfil.email,
    avatarUrl,
  });
}

export function usePerfilUsuarioData() {
  const [usuario, setUsuario] = useState<UsuarioPerfil | null>(null);
  const [loja, setLoja] = useState<LojaGestaoApiResponse | null>(null);
  const [stats, setStats] = useState<UsuarioStatsData>(INITIAL_STATS);
  const [fluxoVendas, setFluxoVendas] = useState<PerfilVendaStatusItem[]>(FLUXO_VENDAS_BASE);
  const [abaAtiva, setAbaAtiva] = useState<PerfilTabId>("produtos");
  const [tabItems, setTabItems] = useState<Record<PerfilTabId, PerfilGridItem[]>>({
    produtos: [],
    vendas: [],
    compras: [],
  });
  const [pageState, setPageState] = useState<PerfilPageState>(INITIAL_STATE);
  const [reloadSeed, setReloadSeed] = useState(0);

  useEffect(() => {
    setStats((currentStats) =>
      currentStats.totalProdutos === tabItems.produtos.length
        ? currentStats
        : {
            ...currentStats,
            totalProdutos: tabItems.produtos.length,
          },
    );
  }, [tabItems.produtos.length]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleAuthChange = () => {
      setReloadSeed((currentSeed) => currentSeed + 1);
    };

    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChange);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChange);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function carregarDados() {
      if (!isAuthenticated()) {
        setPageState({
          isUsuarioLoading: false,
          isConteudoLoading: false,
          usuarioError: "Faca login para visualizar seu perfil.",
          conteudoError: "",
        });
        setUsuario(null);
        setLoja(null);
        setStats(INITIAL_STATS);
        setFluxoVendas(FLUXO_VENDAS_BASE);
        setTabItems({
          produtos: [],
          vendas: [],
          compras: [],
        });
        return;
      }

      setPageState({
        isUsuarioLoading: true,
        isConteudoLoading: true,
        usuarioError: "",
        conteudoError: "",
      });

      try {
        const perfil = await obterPerfilUsuario();

        if (!isMounted) {
          return;
        }

        const [pedidos, lojaAtual, metricas, produtos, enderecosDetalhados] = await Promise.all([
          listarPedidosUsuario(perfil.id),
          obterMinhaLoja().catch(() => null),
          obterMinhasMetricasLoja().catch(() => null),
          listarProdutos(),
          listarEnderecos(perfil.id).catch(() => []),
        ]);

        if (!isMounted) {
          return;
        }

        const idsProdutosPedidos = Array.from(
          new Set(
            pedidos.flatMap((pedido) => pedido.itens.map((item) => item.produtoId)).filter(Boolean),
          ),
        );
        const idsProdutosMetricas = Array.from(
          new Set(
            metricas?.produtosMaisVendidosPorReceita
              .map((produto) => produto.produtoId)
              .filter(Boolean) ?? [],
          ),
        );
        const idsProdutosRelacionados = Array.from(
          new Set([...idsProdutosPedidos, ...idsProdutosMetricas]),
        );
        const produtosPedidosPorId = new Map(produtos.map((produto) => [produto.id, produto]));
        const produtosDetalhadosPedidos = await Promise.all(
          idsProdutosRelacionados
            .filter((produtoId) => !produtoTemImagemUtil(produtosPedidosPorId.get(produtoId)))
            .map((produtoId) => obterProdutoPorId(produtoId).catch(() => null)),
        );

        if (!isMounted) {
          return;
        }

        const produtosEnriquecidosPedidos = combinarProdutos(produtos, produtosDetalhadosPedidos);

        const lojaId = lojaAtual?.id ?? metricas?.lojaId;
        const produtosDaLoja = lojaId
          ? produtosEnriquecidosPedidos
              .filter((produto) => produto.lojaId === lojaId && produto.disponivel !== false)
              .map((produto) => ({
                id: `produto-${produto.id}`,
                titulo: produto.nome,
                subtitulo: produto.categoriaNome,
                valor: currencyFormatter.format(produto.preco),
                imagemUrl: produto.imagem,
                badge: "Publicado",
                produtoId: produto.id,
                categoriaId: produto.categoriaId,
                categoriaNome: produto.categoriaNome,
                precoNumero: produto.preco,
                estoque: produto.estoque,
                disponivel: produto.disponivel ?? true,
                descricao: produto.descricao,
                imagens: produto.imagens,
              }))
          : [];
        const compras = mapearCompras(pedidos, produtosEnriquecidosPedidos);
        const vendas = mapearVendas(pedidos, produtosEnriquecidosPedidos, lojaId);
        const telefones = mapearTelefones(perfil);
        const enderecos = mapearEnderecos(perfil, enderecosDetalhados);

        sincronizarSessaoComPerfil(perfil);
        setUsuario(mapearUsuario(perfil, telefones, enderecos));
        setLoja(lojaAtual);
        setStats(mapearStats(metricas, compras.length, produtosDaLoja.length));
        setFluxoVendas(criarFluxoStatusVendas(metricas));
        setTabItems({
          produtos: produtosDaLoja,
          vendas,
          compras,
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar os dados do perfil.";

        setPageState({
          isUsuarioLoading: false,
          isConteudoLoading: false,
          usuarioError: message,
          conteudoError: message,
        });
        return;
      }

      if (isMounted) {
        setPageState({
          isUsuarioLoading: false,
          isConteudoLoading: false,
          usuarioError: "",
          conteudoError: "",
        });
      }
    }

    void carregarDados();

    return () => {
      isMounted = false;
    };
  }, [reloadSeed]);

  function sincronizarProdutoLojaLocal(produto: PerfilGridItem) {
    setTabItems((currentItems) => {
      const indiceProdutoAtual = currentItems.produtos.findIndex(
        (item) => item.produtoId === produto.produtoId,
      );

      if (produto.disponivel === false) {
        if (indiceProdutoAtual < 0) {
          return currentItems;
        }

        return {
          ...currentItems,
          produtos: currentItems.produtos.filter((item) => item.produtoId !== produto.produtoId),
        };
      }

      if (indiceProdutoAtual < 0) {
        return {
          ...currentItems,
          produtos: [produto, ...currentItems.produtos],
        };
      }

      const proximosProdutos = [...currentItems.produtos];
      proximosProdutos[indiceProdutoAtual] = produto;

      return {
        ...currentItems,
        produtos: proximosProdutos,
      };
    });
  }

  return {
    usuario,
    loja,
    temLoja: Boolean(loja),
    stats,
    fluxoVendas,
    abaAtiva,
    tabItems,
    ...pageState,
    setAbaAtiva,
    sincronizarProdutoLojaLocal,
    recarregarDados: () => setReloadSeed((currentSeed) => currentSeed + 1),
  };
}
