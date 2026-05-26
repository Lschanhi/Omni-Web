import { useEffect, useState } from "react";
import type {
  PerfilGridItem,
  PerfilPageState,
  PerfilTabId,
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
import { criarImagemPlaceholder, listarProdutos } from "../Services/produtos/produtoService";
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

function formatarEndereco(endereco: UsuarioPerfilApiResponse["enderecos"][number] | undefined) {
  if (!endereco) {
    return "";
  }

  return `${endereco.tipoLogradouro} ${endereco.nomeEndereco}, ${endereco.numero} - ${endereco.cidade}/${endereco.uf}`;
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
        status: pedido.status,
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

function mapearVendas(metricas: LojaMetricasApiResponse | null): PerfilGridItem[] {
  if (!metricas) {
    return [];
  }

  return metricas.produtosMaisVendidosPorReceita.map((produto) => ({
    id: `venda-${produto.produtoId}`,
    titulo: produto.nome,
    subtitulo: `${produto.quantidadeVendida} unidades vendidas`,
    valor: currencyFormatter.format(Number(produto.receitaBruta)),
    badge: "Receita",
  }));
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

        const lojaId = lojaAtual?.id ?? metricas?.lojaId;
        const produtosDaLoja = lojaId
          ? produtos
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
        const compras = mapearCompras(pedidos, produtos);
        const vendas = mapearVendas(metricas);
        const telefones = mapearTelefones(perfil);
        const enderecos = mapearEnderecos(perfil, enderecosDetalhados);

        sincronizarSessaoComPerfil(perfil);
        setUsuario(mapearUsuario(perfil, telefones, enderecos));
        setLoja(lojaAtual);
        setStats(mapearStats(metricas, compras.length, produtosDaLoja.length));
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
    abaAtiva,
    tabItems,
    ...pageState,
    setAbaAtiva,
    sincronizarProdutoLojaLocal,
    recarregarDados: () => setReloadSeed((currentSeed) => currentSeed + 1),
  };
}
