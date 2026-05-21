import { useEffect, useState } from "react";
import type {
  PerfilGridItem,
  PerfilPageState,
  PerfilTabContent,
  PerfilTabId,
  UsuarioEnderecoPerfil,
  UsuarioPerfil,
  UsuarioTelefonePerfil,
  UsuarioStatsData,
} from "../types/perfil";
import {
  AUTH_CHANGED_EVENT,
  getStoredUser,
  isAuthenticated,
  updateStoredUser,
} from "../Services/auth/session";
import { listarProdutos } from "../Services/produtos/produtoService";
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

const TAB_METADATA: Record<PerfilTabId, Omit<PerfilTabContent, "itens">> = {
  produtos: {
    titulo: "Produtos publicados",
    descricao: "Itens atualmente disponiveis na sua vitrine.",
    vazioTitulo: "Nenhum produto encontrado",
    vazioDescricao: "Quando houver produtos cadastrados, eles aparecerao aqui.",
  },
  vendas: {
    titulo: "Historico de vendas",
    descricao: "Acompanhe as vendas concluidas e em andamento.",
    vazioTitulo: "Nenhuma venda encontrada",
    vazioDescricao: "Assim que houver dados da loja, eles aparecerao aqui.",
  },
  compras: {
    titulo: "Historico de compras",
    descricao: "Visualize os pedidos feitos pela sua conta.",
    vazioTitulo: "Nenhuma compra encontrada",
    vazioDescricao: "As compras vinculadas ao usuario serao exibidas aqui.",
  },
};

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
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
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

function mapearCompras(pedidos: PedidoLeituraApiResponse[]): PerfilGridItem[] {
  return pedidos.map((pedido) => ({
    id: `pedido-${pedido.id}`,
    titulo: `Pedido #${pedido.id}`,
    subtitulo: `${pedido.status} • ${pedido.tipoEntrega}`,
    valor: currencyFormatter.format(Number(pedido.valorTotalPedido)),
    badge: pedido.itens[0]?.nomeLoja ?? undefined,
  }));
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
              .filter((produto) => produto.lojaId === lojaId)
              .map((produto) => ({
                id: `produto-${produto.id}`,
                titulo: produto.nome,
                subtitulo: produto.categoriaNome,
                valor: currencyFormatter.format(produto.preco),
                imagemUrl: produto.imagem,
                badge: produto.disponivel ? "Publicado" : "Indisponivel",
              }))
          : [];
        const compras = mapearCompras(pedidos);
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

  const tabContent: PerfilTabContent = {
    ...TAB_METADATA[abaAtiva],
    itens: tabItems[abaAtiva],
  };

  return {
    usuario,
    loja,
    temLoja: Boolean(loja),
    stats,
    abaAtiva,
    tabContent,
    ...pageState,
    setAbaAtiva,
    recarregarDados: () => setReloadSeed((currentSeed) => currentSeed + 1),
  };
}
