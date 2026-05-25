import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ImagePlus,
  LockIcon,
  Mail,
  MapPin,
  Minus,
  PackageCheck,
  Phone,
  Plus,
  Store,
  Trash2,
  Truck,
  User,
  X,
} from "lucide-react";
import { Botao } from "../../Components/Botao";
import { Spotlight } from "../../Components/home/SpotLight";
import { Input } from "../../Components/Input";
import { PageLayout } from "../../Components/PageLayout";
import { ProfileModal } from "../../Components/perfil/ProfileModal";
import { ProductGrid } from "../../Components/perfil/ProductGrid";
import { ProfileFeedback } from "../../Components/perfil/ProfileFeedback";
import { ProfileSection } from "../../Components/perfil/ProfileSection";
import { ProfileSkeleton } from "../../Components/perfil/ProfileSkeleton";
import { UserCard } from "../../Components/perfil/UserCard";
import { UserStats } from "../../Components/perfil/UserStats";
import { UserTabs, type UserTabOption } from "../../Components/perfil/UserTabs";
import { usePerfilUsuarioData } from "../../hooks/usePerfilUsuarioData";
import {
  atualizarMinhaEntregaLoja,
  criarMinhaEntregaLoja,
  listarMinhasEntregasLoja,
  removerMinhaEntregaLoja,
  TIPOS_ENTREGA_OPTIONS,
  type LojaEntregaMutacaoPayload,
  type LojaEntregaOpcao,
} from "../../Services/produtos/lojaEntregaService";
import {
  atualizarProduto,
  criarProduto,
  enviarMidiasProduto,
  listarMidiasProduto,
  removerCategoriaDaLoja,
  removerProduto,
  type ProdutoMutacaoPayload,
} from "../../Services/produtos/produtoService";
import { ApiError } from "../../Services/http/apiClient";
import {
  removeStoredProdutoImage,
  saveStoredProdutoImage,
} from "../../Services/produtos/produtoImageStorage";
import { getStoredUser, updateStoredUser } from "../../Services/auth/session";
import {
  criarEndereco,
  atualizarEndereco,
  listarTiposLogradouro,
  removerEndereco,
  TIPOS_LOGRADOURO_FALLBACK,
  type TipoLogradouroOption,
} from "../../Services/user/enderecoService";
import {
  criarMinhaLoja,
  atualizarMinhaLoja,
  type TipoDocumentoFiscalLoja,
} from "../../Services/user/lojaService";
import {
  getStoredLojaAvatar,
  removeStoredLojaAvatar,
  saveStoredLojaAvatar,
} from "../../Services/user/lojaAvatarStorage";
import {
  criarTelefone,
  removerTelefone,
  atualizarTelefone,
  normalizarTelefoneParaApi,
} from "../../Services/user/telefoneService";
import {
  atualizarFotoPerfil,
  atualizarPerfilUsuario,
  removerFotoPerfil,
} from "../../Services/user/usuarioService";
import type {
  PerfilGridItem,
  PerfilIdentityCardData,
  PerfilStatCardItem,
  PerfilTabContent,
  PerfilTabId,
  PerfilVisaoId,
  UsuarioEnderecoPerfil,
  UsuarioTelefonePerfil,
} from "../../types/perfil";

type ModalAberto = "avatar" | "perfil" | "loja" | "produto" | "entregas" | null;
type AvatarDestino = "usuario" | "loja";

type PerfilFormState = {
  nome: string;
  sobrenome: string;
  email: string;
  password: string;
};

type PerfilTelefoneFormState = {
  id?: number;
  numero: string;
  isPrincipal: boolean;
};

type PerfilEnderecoFormState = {
  id?: number;
  tipoLogradouro: string;
  nomeEndereco: string;
  numero: string;
  complemento: string;
  cep: string;
  cidade: string;
  uf: string;
  isPrincipal: boolean;
};

type LojaFormState = {
  nomeFantasia: string;
  tipoDocumentoFiscal: `${TipoDocumentoFiscalLoja}`;
  documentoFiscal: string;
  descricao: string;
  emailContato: string;
  ativa: boolean;
};

type ProdutoFormState = {
  id?: number;
  nome: string;
  categoria: string;
  preco: string;
  estoque: string;
  descricao: string;
  imagemUrl: string;
  disponivel: boolean;
};

type LojaEntregaFormState = {
  id?: number;
  tipoEntregaId: string;
  nome: string;
  valorFrete: string;
  prazoEntregaDias: string;
  observacao: string;
  ativa: boolean;
};

type CategoriaLojaOption = {
  id: string;
  nome: string;
  totalProdutos: number;
};

type LojaFeedbackState = {
  tone: "success" | "error";
  message: string;
};

const PERFIL_FORM_INICIAL: PerfilFormState = {
  nome: "",
  sobrenome: "",
  email: "",
  password: "",
};

const TELEFONE_FORM_INICIAL: PerfilTelefoneFormState = {
  numero: "",
  isPrincipal: false,
};

const ENDERECO_FORM_INICIAL: PerfilEnderecoFormState = {
  tipoLogradouro: "Rua",
  nomeEndereco: "",
  numero: "",
  complemento: "",
  cep: "",
  cidade: "",
  uf: "",
  isPrincipal: false,
};

const LOJA_FORM_INICIAL: LojaFormState = {
  nomeFantasia: "",
  tipoDocumentoFiscal: "1",
  documentoFiscal: "",
  descricao: "",
  emailContato: "",
  ativa: true,
};

const PRODUTO_FORM_INICIAL: ProdutoFormState = {
  nome: "",
  categoria: "",
  preco: "",
  estoque: "0",
  descricao: "",
  imagemUrl: "",
  disponivel: true,
};

const LOJA_ENTREGA_FORM_INICIAL: LojaEntregaFormState = {
  tipoEntregaId: "1",
  nome: "",
  valorFrete: "0,00",
  prazoEntregaDias: "0",
  observacao: "",
  ativa: true,
};

const MAX_AVATAR_FILE_SIZE = 2 * 1024 * 1024;
const MAX_PRODUCT_IMAGE_FILE_SIZE = 2 * 1024 * 1024;
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const VIEW_TABS: UserTabOption[] = [
  { id: "comprador", label: "Comprador" },
  { id: "loja", label: "Loja" },
];

const CONTENT_TABS_BY_VIEW: Record<PerfilVisaoId, UserTabOption[]> = {
  comprador: [{ id: "compras", label: "Compras" }],
  loja: [
    { id: "produtos", label: "Produtos" },
    { id: "vendas", label: "Vendas" },
  ],
};

const TAB_METADATA: Record<PerfilTabId, Omit<PerfilTabContent, "itens">> = {
  produtos: {
    titulo: "Produtos publicados",
    descricao: "Itens atualmente disponiveis na vitrine da sua loja.",
    vazioTitulo: "Nenhum produto encontrado",
    vazioDescricao: "Quando houver produtos cadastrados na loja, eles aparecerao aqui.",
  },
  vendas: {
    titulo: "Desempenho de vendas",
    descricao: "Resumo dos itens que mais convertem receita na sua loja.",
    vazioTitulo: "Nenhuma venda encontrada",
    vazioDescricao: "Assim que a loja tiver historico, os dados aparecerao aqui.",
  },
  compras: {
    titulo: "Historico de compras",
    descricao: "Visualize os pedidos feitos pela sua conta de comprador.",
    vazioTitulo: "Nenhuma compra encontrada",
    vazioDescricao: "As compras vinculadas ao usuario serao exibidas aqui.",
  },
};

function formatarMoeda(valor: number) {
  return currencyFormatter.format(Number(valor ?? 0));
}

function normalizarPrecoParaInput(valor?: number) {
  if (typeof valor !== "number" || Number.isNaN(valor)) {
    return "";
  }

  return valor.toFixed(2).replace(".", ",");
}

function normalizarPrecoParaApi(valor: string) {
  const valorNormalizado = Number(valor.replace(/\./g, "").replace(",", "."));

  if (!Number.isFinite(valorNormalizado) || valorNormalizado < 0) {
    throw new Error("Informe um preco valido para o produto.");
  }

  return valorNormalizado;
}

function normalizarFreteParaInput(valor?: number) {
  if (typeof valor !== "number" || Number.isNaN(valor)) {
    return "0,00";
  }

  return valor.toFixed(2).replace(".", ",");
}

function normalizarFreteParaApi(valor: string, tipoEntregaId: number) {
  if (tipoEntregaId === 1) {
    return 0;
  }

  const valorNormalizado = Number(valor.replace(/\./g, "").replace(",", "."));

  if (!Number.isFinite(valorNormalizado) || valorNormalizado < 0) {
    throw new Error("Informe um valor de frete valido para a opcao de entrega.");
  }

  return valorNormalizado;
}

function normalizarPrazoEntregaParaApi(valor: string) {
  const prazoNormalizado = Number(valor);

  if (!Number.isInteger(prazoNormalizado) || prazoNormalizado < 0 || prazoNormalizado > 365) {
    throw new Error("Informe um prazo de entrega valido entre 0 e 365 dias.");
  }

  return prazoNormalizado;
}

function obterTipoEntregaLabel(tipoEntregaId: number | null | undefined) {
  return TIPOS_ENTREGA_OPTIONS.find((option) => option.id === tipoEntregaId)?.label ?? "Entrega";
}

function criarEntregaLojaForm(opcao?: LojaEntregaOpcao): LojaEntregaFormState {
  if (!opcao) {
    return LOJA_ENTREGA_FORM_INICIAL;
  }

  return {
    id: opcao.id,
    tipoEntregaId: String(opcao.tipoEntregaId ?? 1),
    nome: opcao.nome,
    valorFrete: normalizarFreteParaInput(opcao.valorFrete),
    prazoEntregaDias: String(opcao.prazoEntregaDias ?? 0),
    observacao: opcao.observacao ?? "",
    ativa: opcao.ativa,
  };
}

function ordenarEntregasLoja(opcoes: LojaEntregaOpcao[]) {
  return [...opcoes].sort((a, b) => {
    const tipoA = a.tipoEntregaId ?? Number.MAX_SAFE_INTEGER;
    const tipoB = b.tipoEntregaId ?? Number.MAX_SAFE_INTEGER;

    if (tipoA !== tipoB) {
      return tipoA - tipoB;
    }

    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

function criarProdutoForm(item?: PerfilGridItem): ProdutoFormState {
  if (!item) {
    return PRODUTO_FORM_INICIAL;
  }

  return {
    id: item.produtoId,
    nome: item.titulo,
    categoria: item.categoriaNome ?? item.subtitulo ?? "",
    preco: normalizarPrecoParaInput(item.precoNumero),
    estoque: String(item.estoque ?? 0),
    descricao: item.descricao ?? "",
    imagemUrl: item.imagens?.[0] ?? item.imagemUrl ?? "",
    disponivel: item.disponivel ?? true,
  };
}

function criarCategoriasDaLoja(itens: PerfilGridItem[]): CategoriaLojaOption[] {
  const categorias = new Map<string, CategoriaLojaOption>();

  itens.forEach((item) => {
    const categoriaId = item.categoriaId ?? item.categoriaNome ?? item.subtitulo;
    const categoriaNome = item.categoriaNome ?? item.subtitulo;

    if (!categoriaId || !categoriaNome) {
      return;
    }

    const atual = categorias.get(categoriaId);

    if (atual) {
      atual.totalProdutos += 1;
      return;
    }

    categorias.set(categoriaId, {
      id: categoriaId,
      nome: categoriaNome,
      totalProdutos: 1,
    });
  });

  return Array.from(categorias.values()).sort((a, b) => a.nome.localeCompare(b.nome));
}

function criarMensagemConfirmacaoExclusaoCategoria(categoria: CategoriaLojaOption) {
  return categoria.totalProdutos === 1
    ? `Deseja mesmo excluir a categoria "${categoria.nome}"? O produto vinculado deixara de aparecer para os usuarios, mas continuara salvo no banco.`
    : `Deseja mesmo excluir a categoria "${categoria.nome}"? Os ${categoria.totalProdutos} produtos vinculados deixarao de aparecer para os usuarios, mas continuarao salvos no banco.`;
}

function criarMensagemSucessoExclusaoCategoria(
  categoria: CategoriaLojaOption,
  totalProdutosRemovidos: number,
) {
  return totalProdutosRemovidos === 1
    ? `Categoria "${categoria.nome}" removida com sucesso. O produto vinculado nao aparece mais na vitrine.`
    : `Categoria "${categoria.nome}" removida com sucesso. ${totalProdutosRemovidos} produtos deixaram de aparecer na vitrine.`;
}

function formatarAvaliacaoMedia(avaliacaoMedia: number) {
  return avaliacaoMedia ? `${avaliacaoMedia.toFixed(1)} / 5` : "Sem nota";
}

function formatarEnderecoLoja(
  loja: {
    nomeEndereco?: string | null;
    numeroEndereco?: string | null;
    complementoEndereco?: string | null;
    cidade?: string | null;
    uf?: string | null;
  } | null,
) {
  if (!loja?.nomeEndereco?.trim()) {
    return "";
  }

  const partes = [`${loja.nomeEndereco.trim()}, ${loja.numeroEndereco?.trim() || "S/N"}`];

  if (loja.complementoEndereco?.trim()) {
    partes.push(loja.complementoEndereco.trim());
  }

  const cidadeUf = [loja.cidade?.trim(), loja.uf?.trim()].filter(Boolean).join("/");

  if (cidadeUf) {
    partes.push(cidadeUf);
  }

  return partes.join(" - ");
}

function criarCardComprador(
  usuario: {
    nome: string;
    email: string;
    telefone: string;
    endereco: string;
    avatarUrl?: string;
    resumo?: string;
    contaVerificada?: boolean;
  } | null,
  podeGerenciarLoja: boolean,
): PerfilIdentityCardData | null {
  if (!usuario) {
    return null;
  }

  return {
    rotulo: "Perfil do usuario",
    nome: usuario.nome,
    resumo: usuario.resumo || "Area pronta para bio, cargo ou descricao curta do usuario.",
    avatarUrl: usuario.avatarUrl,
    fotoHint: "Clique na foto para alterar",
    badge: usuario.contaVerificada ? "Conta verificada" : "Conta em configuracao",
    infoItems: [
      { key: "email", label: "Email", value: usuario.email },
      { key: "telefone", label: "Telefone", value: usuario.telefone },
      { key: "endereco", label: "Endereco", value: usuario.endereco },
    ],
    footerText: podeGerenciarLoja
      ? "Sua loja pode usar o endereco e o telefone principal que ja estao cadastrados no perfil."
      : "Cadastre um telefone e um endereco principal para liberar a criacao da loja.",
  };
}

function criarCardLoja(
  loja: {
    nomeFantasia: string;
    descricao?: string | null;
    emailContato?: string | null;
    avatarUrl?: string | null;
    logoUrl?: string | null;
    numeroTelefone?: string | null;
    ativa: boolean;
    nomeEndereco?: string | null;
    numeroEndereco?: string | null;
    complementoEndereco?: string | null;
    cidade?: string | null;
    uf?: string | null;
  } | null,
  usuario: {
    email: string;
    telefone: string;
    endereco: string;
  } | null,
  avatarLojaUrl?: string,
): PerfilIdentityCardData | null {
  if (!loja) {
    return null;
  }

  return {
    rotulo: "Perfil da loja",
    nome: loja.nomeFantasia,
    resumo:
      loja.descricao?.trim() ||
      "Esta aba mostra a apresentacao publica e os principais dados operacionais da loja.",
    avatarUrl: avatarLojaUrl || loja.logoUrl || loja.avatarUrl || undefined,
    fotoHint: "Clique na foto para alterar a imagem da loja",
    badge: loja.ativa ? "Loja ativa" : "Loja em configuracao",
    infoItems: [
      {
        key: "email",
        label: "Email de contato",
        value: loja.emailContato?.trim() || usuario?.email || "",
      },
      {
        key: "telefone",
        label: "Telefone da loja",
        value: loja.numeroTelefone?.trim() || usuario?.telefone || "",
      },
      {
        key: "endereco",
        label: "Endereco da loja",
        value: formatarEnderecoLoja(loja) || usuario?.endereco || "",
      },
    ],
    footerText:
      "Use esta visao para revisar os dados publicos da loja e acompanhar a performance da sua vitrine.",
  };
}

function criarStatsComprador(
  usuario: {
    telefones: Array<unknown>;
    enderecos: Array<unknown>;
    contaVerificada?: boolean;
  } | null,
  stats: { totalCompras: number },
): PerfilStatCardItem[] {
  return [
    {
      key: "total-compras",
      label: "Compras",
      value: `${stats.totalCompras}`,
    },
    {
      key: "telefones",
      label: "Telefones",
      value: `${usuario?.telefones.length ?? 0}`,
    },
    {
      key: "enderecos",
      label: "Enderecos",
      value: `${usuario?.enderecos.length ?? 0}`,
    },
    {
      key: "status-conta",
      label: "Conta",
      value: usuario?.contaVerificada ? "Verificada" : "Em ajuste",
    },
  ];
}

function resolverAvatarLoja(
  loja: {
    id: number;
    avatarUrl?: string | null;
    logoUrl?: string | null;
  } | null,
) {
  if (!loja) {
    return "";
  }

  const avatarDaApi = loja.logoUrl?.trim() || loja.avatarUrl?.trim() || "";

  if (avatarDaApi) {
    return avatarDaApi;
  }

  return getStoredLojaAvatar(loja.id) ?? "";
}

function criarStatsLoja(
  stats: {
    avaliacaoMedia: number;
    totalProdutos: number;
    totalVendas: number;
    faturamentoBruto: number;
    ticketMedio: number;
  },
): PerfilStatCardItem[] {
  return [
    {
      key: "avaliacao-media",
      label: "Avaliacao media",
      value: formatarAvaliacaoMedia(stats.avaliacaoMedia),
    },
    {
      key: "total-produtos",
      label: "Produtos",
      value: `${stats.totalProdutos}`,
    },
    {
      key: "total-vendas",
      label: "Vendas",
      value: `${stats.totalVendas}`,
    },
    {
      key: "faturamento-bruto",
      label: "Faturamento",
      value: formatarMoeda(stats.faturamentoBruto),
    },
    {
      key: "ticket-medio",
      label: "Ticket medio",
      value: formatarMoeda(stats.ticketMedio),
    },
  ];
}

function lerArquivoComoDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Nao foi possivel carregar a imagem selecionada."));
    };

    reader.onerror = () => {
      reject(new Error("Nao foi possivel ler o arquivo da imagem."));
    };

    reader.readAsDataURL(file);
  });
}

function normalizarCep(cep: string) {
  return cep.replace(/\D/g, "");
}

function formatarCep(cep: string) {
  const cepNormalizado = normalizarCep(cep).slice(0, 8);

  if (cepNormalizado.length <= 5) {
    return cepNormalizado;
  }

  return `${cepNormalizado.slice(0, 5)}-${cepNormalizado.slice(5)}`;
}

function telefoneTemConteudo(telefone: PerfilTelefoneFormState | null) {
  return Boolean(telefone?.numero.trim());
}

function normalizarTelefoneParaComparacao(telefone: string) {
  return telefone.replace(/\D/g, "");
}

function enderecoTemConteudo(endereco: PerfilEnderecoFormState | null) {
  if (!endereco) {
    return false;
  }

  return Boolean(
    endereco.tipoLogradouro.trim() ||
      endereco.nomeEndereco.trim() ||
      endereco.numero.trim() ||
      endereco.complemento.trim() ||
      endereco.cep.trim() ||
      endereco.cidade.trim() ||
      endereco.uf.trim(),
  );
}

function obterErroEnderecoInvalido(endereco: PerfilEnderecoFormState | null) {
  if (!endereco || !enderecoTemConteudo(endereco)) {
    return null;
  }

  if (!endereco.tipoLogradouro.trim()) {
    return "Selecione o tipo de logradouro do novo endereco.";
  }

  if (!endereco.nomeEndereco.trim()) {
    return "Informe o nome do novo endereco.";
  }

  if (!endereco.numero.trim()) {
    return "Informe o numero do novo endereco.";
  }

  if (normalizarCep(endereco.cep).length !== 8) {
    return "Informe um CEP valido com 8 numeros para o novo endereco.";
  }

  if (!endereco.cidade.trim()) {
    return "Informe a cidade do novo endereco.";
  }

  if (endereco.uf.trim().length !== 2) {
    return "Informe uma UF valida com 2 letras para o novo endereco.";
  }

  return null;
}

function normalizarValorEnderecoFormulario(
  field: keyof PerfilEnderecoFormState,
  value: string,
) {
  if (field === "cep") {
    return formatarCep(value);
  }

  if (field === "uf") {
    return value.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase();
  }

  return value;
}

function obterMensagemErroLoja(error: unknown) {
  const fallback = "Nao foi possivel salvar a loja.";
  const message = error instanceof Error ? error.message : fallback;

  if (
    message.includes("Cannot insert the value NULL into column 'Slug'") &&
    message.includes("TBL_LOJA")
  ) {
    return "A API da loja no Azure ainda esta com o banco desatualizado: a coluna Slug continua obrigatoria, mas o contrato atual da loja nao envia mais esse campo. Aplique a migration `20260521044322_RemoveSkuSlugProdutosLojas` na API e tente novamente.";
  }

  return message || fallback;
}

function mapearTelefoneParaFormulario(telefone: UsuarioTelefonePerfil): PerfilTelefoneFormState {
  return {
    id: telefone.id,
    numero: telefone.numero,
    isPrincipal: telefone.isPrincipal,
  };
}

function deduplicarTelefonesParaFormulario(
  telefones: PerfilTelefoneFormState[],
  telefoneLojaId?: number | null,
) {
  const telefonesPorNumero = new Map<string, PerfilTelefoneFormState[]>();

  for (const telefone of telefones) {
    const numeroNormalizado =
      normalizarTelefoneParaComparacao(telefone.numero) || `sem-numero-${telefone.id ?? telefone.numero}`;
    const grupoAtual = telefonesPorNumero.get(numeroNormalizado) ?? [];

    grupoAtual.push(telefone);
    telefonesPorNumero.set(numeroNormalizado, grupoAtual);
  }

  const telefonesUnicos: PerfilTelefoneFormState[] = [];
  const telefonesDuplicadosIds: number[] = [];

  for (const grupo of telefonesPorNumero.values()) {
    const telefoneCanonical =
      grupo.find((telefone) => telefone.id === telefoneLojaId) ??
      grupo.find((telefone) => telefone.isPrincipal) ??
      grupo[0];

    telefonesUnicos.push({
      ...telefoneCanonical,
      isPrincipal: grupo.some((telefone) => telefone.isPrincipal),
    });

    grupo.forEach((telefone) => {
      if (telefone.id && telefone.id !== telefoneCanonical.id) {
        telefonesDuplicadosIds.push(telefone.id);
      }
    });
  }

  const estadoNormalizado = normalizarPrincipalTelefones(telefonesUnicos, null);

  return {
    telefones: estadoNormalizado.telefones,
    telefonesDuplicadosIds,
  };
}

function encontrarTelefoneDuplicado(telefones: PerfilTelefoneFormState[]) {
  const telefonesNormalizados = new Set<string>();

  for (const telefone of telefones) {
    const numeroNormalizado = normalizarTelefoneParaComparacao(telefone.numero);

    if (!numeroNormalizado) {
      continue;
    }

    if (telefonesNormalizados.has(numeroNormalizado)) {
      return true;
    }

    telefonesNormalizados.add(numeroNormalizado);
  }

  return false;
}

function mapearEnderecoParaFormulario(endereco: UsuarioEnderecoPerfil): PerfilEnderecoFormState {
  return {
    id: endereco.id,
    tipoLogradouro: endereco.tipoLogradouro,
    nomeEndereco: endereco.nomeEndereco,
    numero: endereco.numero,
    complemento: endereco.complemento ?? "",
    cep: endereco.cep,
    cidade: endereco.cidade,
    uf: endereco.uf,
    isPrincipal: endereco.isPrincipal,
  };
}

function normalizarPrincipalTelefones(
  telefones: PerfilTelefoneFormState[],
  novoTelefone: PerfilTelefoneFormState | null,
) {
  if (novoTelefone?.isPrincipal) {
    return {
      telefones: telefones.map((telefone) => ({ ...telefone, isPrincipal: false })),
      novoTelefone,
    };
  }

  const principalIndex = telefones.findIndex((telefone) => telefone.isPrincipal);

  if (principalIndex >= 0) {
    return {
      telefones: telefones.map((telefone, index) => ({
        ...telefone,
        isPrincipal: index === principalIndex,
      })),
      novoTelefone: novoTelefone ? { ...novoTelefone, isPrincipal: false } : null,
    };
  }

  if (telefones.length > 0) {
    return {
      telefones: telefones.map((telefone, index) => ({
        ...telefone,
        isPrincipal: index === 0,
      })),
      novoTelefone: novoTelefone ? { ...novoTelefone, isPrincipal: false } : null,
    };
  }

  if (novoTelefone) {
    return {
      telefones,
      novoTelefone: { ...novoTelefone, isPrincipal: true },
    };
  }

  return {
    telefones,
    novoTelefone,
  };
}

function normalizarPrincipalEnderecos(
  enderecos: PerfilEnderecoFormState[],
  novoEndereco: PerfilEnderecoFormState | null,
) {
  if (novoEndereco?.isPrincipal) {
    return {
      enderecos: enderecos.map((endereco) => ({ ...endereco, isPrincipal: false })),
      novoEndereco,
    };
  }

  const principalIndex = enderecos.findIndex((endereco) => endereco.isPrincipal);

  if (principalIndex >= 0) {
    return {
      enderecos: enderecos.map((endereco, index) => ({
        ...endereco,
        isPrincipal: index === principalIndex,
      })),
      novoEndereco: novoEndereco ? { ...novoEndereco, isPrincipal: false } : null,
    };
  }

  if (enderecos.length > 0) {
    return {
      enderecos: enderecos.map((endereco, index) => ({
        ...endereco,
        isPrincipal: index === 0,
      })),
      novoEndereco: novoEndereco ? { ...novoEndereco, isPrincipal: false } : null,
    };
  }

  if (novoEndereco) {
    return {
      enderecos,
      novoEndereco: { ...novoEndereco, isPrincipal: true },
    };
  }

  return {
    enderecos,
    novoEndereco,
  };
}

export function PerfilUsuarioPage() {
  // Consome toda a logica do perfil em um hook separado da interface.
  const {
    usuario,
    loja,
    temLoja,
    stats,
    abaAtiva,
    tabItems,
    isUsuarioLoading,
    isConteudoLoading,
    usuarioError,
    conteudoError,
    setAbaAtiva,
    recarregarDados,
  } = usePerfilUsuarioData();
  const [visaoAtiva, setVisaoAtiva] = useState<PerfilVisaoId>("comprador");
  const [modalAberto, setModalAberto] = useState<ModalAberto>(null);
  const [perfilForm, setPerfilForm] = useState<PerfilFormState>(PERFIL_FORM_INICIAL);
  const [avatarDestino, setAvatarDestino] = useState<AvatarDestino>("usuario");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarLojaUrl, setAvatarLojaUrl] = useState("");
  const [avatarNomeArquivo, setAvatarNomeArquivo] = useState("");
  const [avatarErroAcao, setAvatarErroAcao] = useState("");
  const [isSalvandoAvatar, setIsSalvandoAvatar] = useState(false);
  const [telefonesForm, setTelefonesForm] = useState<PerfilTelefoneFormState[]>([]);
  const [novoTelefoneForm, setNovoTelefoneForm] = useState<PerfilTelefoneFormState | null>(null);
  const [telefonesRemovidos, setTelefonesRemovidos] = useState<number[]>([]);
  const [enderecosForm, setEnderecosForm] = useState<PerfilEnderecoFormState[]>([]);
  const [novoEnderecoForm, setNovoEnderecoForm] = useState<PerfilEnderecoFormState | null>(null);
  const [enderecosRemovidos, setEnderecosRemovidos] = useState<number[]>([]);
  const [lojaForm, setLojaForm] = useState<LojaFormState>(LOJA_FORM_INICIAL);
  const [produtoForm, setProdutoForm] = useState<ProdutoFormState>(PRODUTO_FORM_INICIAL);
  const [entregaLojaForm, setEntregaLojaForm] =
    useState<LojaEntregaFormState>(LOJA_ENTREGA_FORM_INICIAL);
  const [entregasLoja, setEntregasLoja] = useState<LojaEntregaOpcao[]>([]);
  const [produtoImagemArquivo, setProdutoImagemArquivo] = useState<File | null>(null);
  const [tiposLogradouro, setTiposLogradouro] = useState<TipoLogradouroOption[]>(
    TIPOS_LOGRADOURO_FALLBACK,
  );
  const [perfilErroAcao, setPerfilErroAcao] = useState("");
  const [lojaErroAcao, setLojaErroAcao] = useState("");
  const [produtoErroAcao, setProdutoErroAcao] = useState("");
  const [entregaErroAcao, setEntregaErroAcao] = useState("");
  const [isSalvandoPerfil, setIsSalvandoPerfil] = useState(false);
  const [isSalvandoLoja, setIsSalvandoLoja] = useState(false);
  const [isSalvandoProduto, setIsSalvandoProduto] = useState(false);
  const [isRemovendoProduto, setIsRemovendoProduto] = useState(false);
  const [produtoConfirmandoExclusao, setProdutoConfirmandoExclusao] = useState(false);
  const [isCarregandoEntregas, setIsCarregandoEntregas] = useState(false);
  const [isSalvandoEntrega, setIsSalvandoEntrega] = useState(false);
  const [entregaRemovendoId, setEntregaRemovendoId] = useState<number | null>(null);
  const [categoriaLojaAtiva, setCategoriaLojaAtiva] = useState("todas");
  const [categoriaLojaRemovendoId, setCategoriaLojaRemovendoId] = useState<string | null>(null);
  const [categoriaLojaModoExclusao, setCategoriaLojaModoExclusao] = useState(false);
  const [categoriaLojaPendenteExclusao, setCategoriaLojaPendenteExclusao] =
    useState<CategoriaLojaOption | null>(null);
  const [lojaFeedback, setLojaFeedback] = useState<LojaFeedbackState | null>(null);

  const podeGerenciarLoja = Boolean(usuario?.enderecoPrincipalId && usuario?.telefonePrincipalId);
  const produtosDaLoja = tabItems.produtos;
  const categoriasDaLoja = criarCategoriasDaLoja(produtosDaLoja);
  const visoesDisponiveis = temLoja
    ? VIEW_TABS
    : VIEW_TABS.filter((visao) => visao.id !== "loja");
  const abasDisponiveis = CONTENT_TABS_BY_VIEW[visaoAtiva];
  const abaAtivaResolvida = abasDisponiveis.some((aba) => aba.id === abaAtiva)
    ? (abaAtiva as PerfilTabId)
    : (abasDisponiveis[0]?.id as PerfilTabId);
  const isStoreProductsTab = visaoAtiva === "loja" && abaAtivaResolvida === "produtos";
  const tabContent: PerfilTabContent = {
    ...TAB_METADATA[abaAtivaResolvida],
    itens: tabItems[abaAtivaResolvida],
  };
  const itensExibidos =
    isStoreProductsTab && categoriaLojaAtiva !== "todas"
      ? tabContent.itens.filter((item) => item.categoriaId === categoriaLojaAtiva)
      : tabContent.itens;
  const estaFiltrandoCategoria = isStoreProductsTab && categoriaLojaAtiva !== "todas";
  const cardAtivo =
    visaoAtiva === "loja"
      ? criarCardLoja(loja, usuario, avatarLojaUrl)
      : criarCardComprador(usuario, podeGerenciarLoja);
  const statsAtivos =
    visaoAtiva === "loja" ? criarStatsLoja(stats) : criarStatsComprador(usuario, stats);
  const heroBadge = visaoAtiva === "loja" ? "Central da loja" : "Central do perfil";
  const heroTitulo = visaoAtiva === "loja" ? loja?.nomeFantasia || "Minha loja" : "Meu perfil";
  const heroDescricao =
    visaoAtiva === "loja"
      ? loja?.descricao?.trim() ||
        "Acompanhe a identidade publica da loja, os indicadores e os itens da vitrine em um painel separado do perfil de comprador."
      : "Acompanhe seus dados de comprador, edite informacoes pessoais e consulte o historico de compras em um painel separado da loja.";
  const editandoFotoLoja = avatarDestino === "loja";
  const tituloModalAvatar = editandoFotoLoja ? "Foto da loja" : "Foto do perfil";
  const descricaoModalAvatar = editandoFotoLoja
    ? "Escolha uma imagem do seu computador para representar a loja separadamente do perfil neste navegador."
    : "Escolha uma imagem do seu computador para usar como foto do perfil neste navegador.";
  const altPreviewAvatar = editandoFotoLoja
    ? "Preview da foto da loja"
    : "Preview da foto do perfil";
  const labelRemoverAvatar = editandoFotoLoja ? "Remover foto da loja" : "Remover foto";
  const labelSalvarAvatar = editandoFotoLoja ? "Salvar foto da loja" : "Salvar foto";
  const tituloModalProduto = produtoForm.id ? "Editar produto" : "Adicionar produto";
  const descricaoModalProduto = produtoForm.id
    ? "Atualize os dados do produto selecionado sem sair do painel da loja."
    : "Cadastre um novo produto para publica-lo na vitrine da loja.";
  const isProcessandoProduto = isSalvandoProduto || isRemovendoProduto;
  const entregaEmEdicao = Boolean(entregaLojaForm.id);
  const tipoEntregaAtualId = Number(entregaLojaForm.tipoEntregaId || 1);
  const tipoEntregaAtualEhRetirada = tipoEntregaAtualId === 1;
  const tituloModalEntregas = "Opcoes de entrega";
  const descricaoModalEntregas =
    "Cadastre, ajuste ou remova as opcoes de entrega e os valores de frete da sua loja.";

  useEffect(() => {
    if (!temLoja && visaoAtiva === "loja") {
      setVisaoAtiva("comprador");
    }
  }, [temLoja, visaoAtiva]);

  useEffect(() => {
    if (!abasDisponiveis.some((aba) => aba.id === abaAtiva)) {
      setAbaAtiva(abasDisponiveis[0]?.id as PerfilTabId);
    }
  }, [abaAtiva, abasDisponiveis, setAbaAtiva]);

  useEffect(() => {
    if (!isStoreProductsTab) {
      setCategoriaLojaAtiva("todas");
      setCategoriaLojaModoExclusao(false);
      setCategoriaLojaPendenteExclusao(null);
      return;
    }

    if (
      categoriaLojaAtiva !== "todas" &&
      !categoriasDaLoja.some((categoria) => categoria.id === categoriaLojaAtiva)
    ) {
      setCategoriaLojaAtiva("todas");
    }
  }, [categoriaLojaAtiva, categoriasDaLoja, isStoreProductsTab]);

  useEffect(() => {
    if (
      categoriaLojaPendenteExclusao &&
      !categoriasDaLoja.some((categoria) => categoria.id === categoriaLojaPendenteExclusao.id)
    ) {
      setCategoriaLojaPendenteExclusao(null);
    }
  }, [categoriaLojaPendenteExclusao, categoriasDaLoja]);

  useEffect(() => {
    setAvatarLojaUrl(resolverAvatarLoja(loja));
  }, [loja]);

  useEffect(() => {
    if (!usuario) {
      return;
    }

    const usuarioId = usuario.id;
    let isMounted = true;

    async function carregarTiposLogradouro() {
      try {
        const tipos = await listarTiposLogradouro(usuarioId);

        if (isMounted && tipos.length > 0) {
          setTiposLogradouro(tipos);
        }
      } catch {
        if (isMounted) {
          setTiposLogradouro(TIPOS_LOGRADOURO_FALLBACK);
        }
      }
    }

    void carregarTiposLogradouro();

    return () => {
      isMounted = false;
    };
  }, [usuario]);

  function fecharModal() {
    setModalAberto(null);
    setAvatarDestino("usuario");
    setAvatarPreview("");
    setAvatarNomeArquivo("");
    setAvatarErroAcao("");
    setPerfilErroAcao("");
    setLojaErroAcao("");
    setProdutoErroAcao("");
    setEntregaErroAcao("");
    setProdutoConfirmandoExclusao(false);
    setProdutoForm(PRODUTO_FORM_INICIAL);
    setEntregaLojaForm(LOJA_ENTREGA_FORM_INICIAL);
    setProdutoImagemArquivo(null);
    setNovoTelefoneForm(null);
    setNovoEnderecoForm(null);
    setTelefonesRemovidos([]);
    setEnderecosRemovidos([]);
  }

  function abrirModalAvatar() {
    if (!usuario) {
      return;
    }

    const editandoFotoLoja = visaoAtiva === "loja" && Boolean(loja);

    setAvatarErroAcao("");
    setAvatarDestino(editandoFotoLoja ? "loja" : "usuario");
    setAvatarPreview(editandoFotoLoja ? avatarLojaUrl : usuario.avatarUrl ?? "");
    setAvatarNomeArquivo("");
    setModalAberto("avatar");
  }

  function abrirModalPerfil() {
    if (!usuario) {
      return;
    }

    const telefonesDeduplicados = deduplicarTelefonesParaFormulario(
      usuario.telefones.map(mapearTelefoneParaFormulario),
      loja?.telefoneId,
    );

    setPerfilErroAcao("");
    setPerfilForm({
      nome: usuario.primeiroNome,
      sobrenome: usuario.sobrenome,
      email: usuario.email,
      password: "",
    });
    setTelefonesForm(telefonesDeduplicados.telefones);
    setEnderecosForm(usuario.enderecos.map(mapearEnderecoParaFormulario));
    setNovoTelefoneForm(null);
    setNovoEnderecoForm(null);
    setTelefonesRemovidos(telefonesDeduplicados.telefonesDuplicadosIds);
    setEnderecosRemovidos([]);
    setModalAberto("perfil");
  }

  function abrirModalLoja() {
    if (!usuario) {
      return;
    }

    if (!podeGerenciarLoja) {
      alert("Cadastre um telefone e um endereco principal no perfil antes de criar a loja.");
      return;
    }

    setLojaErroAcao("");
    setLojaForm(
      loja
        ? {
            nomeFantasia: loja.nomeFantasia,
            tipoDocumentoFiscal: String(loja.tipoDocumentoFiscal) as `${TipoDocumentoFiscalLoja}`,
            documentoFiscal: loja.documentoFiscalFormatado || loja.documentoFiscal,
            descricao: loja.descricao ?? "",
            emailContato: loja.emailContato ?? usuario.email,
            ativa: loja.ativa,
          }
        : {
            nomeFantasia: usuario.nome,
            tipoDocumentoFiscal: "1",
            documentoFiscal: "",
            descricao: "",
            emailContato: usuario.email,
            ativa: true,
          },
    );
    setModalAberto("loja");
  }

  function abrirModalProduto(item?: PerfilGridItem) {
    setLojaFeedback(null);
    setProdutoErroAcao("");
    setProdutoConfirmandoExclusao(false);
    setProdutoForm(criarProdutoForm(item));
    setProdutoImagemArquivo(null);
    setModalAberto("produto");
  }

  function handleAlternarModoExclusaoCategorias() {
    setCategoriaLojaModoExclusao((modoAtual) => {
      const proximoModo = !modoAtual;

      if (!proximoModo) {
        setCategoriaLojaPendenteExclusao(null);
      }

      return proximoModo;
    });
    setLojaFeedback(null);
  }

  function handleSolicitarRemocaoCategoriaLoja(categoria: CategoriaLojaOption) {
    if (categoriaLojaRemovendoId) {
      return;
    }

    setCategoriaLojaPendenteExclusao(categoria);
    setLojaFeedback(null);
  }

  async function handleRemoverCategoriaLoja() {
    if (!categoriaLojaPendenteExclusao || categoriaLojaRemovendoId) {
      return;
    }

    const categoria = categoriaLojaPendenteExclusao;
    const produtosDaCategoria = produtosDaLoja.filter((item) => item.categoriaId === categoria.id);

    try {
      setCategoriaLojaRemovendoId(categoria.id);
      setLojaFeedback(null);

      let mensagemSucesso = criarMensagemSucessoExclusaoCategoria(
        categoria,
        produtosDaCategoria.length,
      );

      try {
        const resposta = await removerCategoriaDaLoja(categoria.nome, true);
        const mensagemDaApi = resposta.mensagem?.trim();

        if (mensagemDaApi) {
          mensagemSucesso = mensagemDaApi;
        }
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 404) {
          throw error;
        }

        for (const item of produtosDaCategoria) {
          if (!item.produtoId) {
            continue;
          }

          await removerProduto(item.produtoId);
          removeStoredProdutoImage(item.produtoId);
        }

        mensagemSucesso = criarMensagemSucessoExclusaoCategoria(
          categoria,
          produtosDaCategoria.length,
        );
      }

      if (categoriaLojaAtiva === categoria.id) {
        setCategoriaLojaAtiva("todas");
      }

      setCategoriaLojaPendenteExclusao(null);
      setCategoriaLojaModoExclusao(false);
      recarregarDados();
      setLojaFeedback({
        tone: "success",
        message: mensagemSucesso,
      });
    } catch (error) {
      setLojaFeedback({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Nao foi possivel excluir a categoria da loja.",
      });
    } finally {
      setCategoriaLojaRemovendoId(null);
    }
  }

  async function abrirModalEntregas() {
    if (!temLoja) {
      return;
    }

    setEntregaErroAcao("");
    setEntregaLojaForm(LOJA_ENTREGA_FORM_INICIAL);
    setModalAberto("entregas");
    setIsCarregandoEntregas(true);

    try {
      const opcoes = await listarMinhasEntregasLoja();
      setEntregasLoja(ordenarEntregasLoja(opcoes));
    } catch (error) {
      setEntregaErroAcao(
        error instanceof Error ? error.message : "Nao foi possivel carregar as entregas da loja.",
      );
    } finally {
      setIsCarregandoEntregas(false);
    }
  }

  function handlePerfilInputChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setPerfilForm((currentData) => ({
      ...currentData,
      [name]: value,
    }));
    setPerfilErroAcao("");
  }

  function handleEntregaInputChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;

    setEntregaLojaForm((currentData) => {
      const proximoEstado = {
        ...currentData,
        [name]: value,
      };

      if (name === "tipoEntregaId") {
        const tipoEntregaId = Number(value);

        if (!currentData.nome.trim()) {
          proximoEstado.nome = obterTipoEntregaLabel(tipoEntregaId);
        }

        if (tipoEntregaId === 1) {
          proximoEstado.valorFrete = "0,00";
        }
      }

      return proximoEstado;
    });
    setEntregaErroAcao("");
  }

  function handleEntregaAtivaChange(event: ChangeEvent<HTMLInputElement>) {
    const { checked } = event.target;

    setEntregaLojaForm((currentData) => ({
      ...currentData,
      ativa: checked,
    }));
    setEntregaErroAcao("");
  }

  function handleEditarEntrega(opcao: LojaEntregaOpcao) {
    setEntregaLojaForm(criarEntregaLojaForm(opcao));
    setEntregaErroAcao("");
  }

  function handleNovaEntrega() {
    setEntregaLojaForm(LOJA_ENTREGA_FORM_INICIAL);
    setEntregaErroAcao("");
  }

  function handleCancelarEntrega() {
    setEntregaLojaForm(LOJA_ENTREGA_FORM_INICIAL);
    setEntregaErroAcao("");
  }

  async function handleSalvarEntregaLoja(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!temLoja || isSalvandoEntrega) {
      return;
    }

    try {
      setIsSalvandoEntrega(true);
      setEntregaErroAcao("");

      const tipoEntregaId = Number(entregaLojaForm.tipoEntregaId);

      if (!TIPOS_ENTREGA_OPTIONS.some((option) => option.id === tipoEntregaId)) {
        throw new Error("Selecione um tipo de entrega valido.");
      }

      if (!entregaLojaForm.nome.trim()) {
        throw new Error("Informe o nome da opcao de entrega.");
      }

      const payload: LojaEntregaMutacaoPayload = {
        tipoEntregaId,
        nome: entregaLojaForm.nome.trim(),
        valorFrete: normalizarFreteParaApi(entregaLojaForm.valorFrete, tipoEntregaId),
        prazoEntregaDias: normalizarPrazoEntregaParaApi(entregaLojaForm.prazoEntregaDias),
        observacao: entregaLojaForm.observacao.trim() || undefined,
        ativa: entregaLojaForm.ativa,
      };

      const opcaoSalva = entregaLojaForm.id
        ? await atualizarMinhaEntregaLoja(entregaLojaForm.id, payload)
        : await criarMinhaEntregaLoja(payload);

      setEntregasLoja((currentData) =>
        ordenarEntregasLoja(
          entregaLojaForm.id
            ? currentData.map((opcao) => (opcao.id === opcaoSalva.id ? opcaoSalva : opcao))
            : [...currentData, opcaoSalva],
        ),
      );
      setEntregaLojaForm(LOJA_ENTREGA_FORM_INICIAL);
      alert(entregaLojaForm.id ? "Opcao de entrega atualizada com sucesso!" : "Opcao de entrega criada com sucesso!");
    } catch (error) {
      setEntregaErroAcao(
        error instanceof Error ? error.message : "Nao foi possivel salvar a opcao de entrega.",
      );
    } finally {
      setIsSalvandoEntrega(false);
    }
  }

  async function handleRemoverEntregaLoja(opcao: LojaEntregaOpcao) {
    if (entregaRemovendoId || isSalvandoEntrega) {
      return;
    }

    try {
      setEntregaRemovendoId(opcao.id);
      setEntregaErroAcao("");

      await removerMinhaEntregaLoja(opcao.id);

      setEntregasLoja((currentData) => currentData.filter((item) => item.id !== opcao.id));

      if (entregaLojaForm.id === opcao.id) {
        setEntregaLojaForm(LOJA_ENTREGA_FORM_INICIAL);
      }
    } catch (error) {
      setEntregaErroAcao(
        error instanceof Error ? error.message : "Nao foi possivel remover a opcao de entrega.",
      );
    } finally {
      setEntregaRemovendoId(null);
    }
  }

  function handleTelefoneExistenteChange(index: number, value: string) {
    setTelefonesForm((currentData) =>
      currentData.map((telefone, currentIndex) =>
        currentIndex === index ? { ...telefone, numero: value } : telefone,
      ),
    );
    setPerfilErroAcao("");
  }

  function handleTelefonePrincipalChange(index: number) {
    const proximoEstado = normalizarPrincipalTelefones(
      telefonesForm.map((telefone, currentIndex) => ({
        ...telefone,
        isPrincipal: currentIndex === index,
      })),
      novoTelefoneForm ? { ...novoTelefoneForm, isPrincipal: false } : null,
    );

    setTelefonesForm(proximoEstado.telefones);
    setNovoTelefoneForm(proximoEstado.novoTelefone);
    setPerfilErroAcao("");
  }

  function handleNovoTelefoneChange(value: string) {
    setNovoTelefoneForm((currentData) => ({
      ...(currentData ?? TELEFONE_FORM_INICIAL),
      numero: value,
    }));
    setPerfilErroAcao("");
  }

  function handleNovoTelefonePrincipalChange() {
    const proximoEstado = normalizarPrincipalTelefones(telefonesForm, {
      ...(novoTelefoneForm ?? TELEFONE_FORM_INICIAL),
      isPrincipal: true,
    });

    setTelefonesForm(proximoEstado.telefones);
    setNovoTelefoneForm(proximoEstado.novoTelefone);
    setPerfilErroAcao("");
  }

  function handleRemoverTelefone(index: number) {
    const telefoneRemovido = telefonesForm[index];
    const proximoEstado = normalizarPrincipalTelefones(
      telefonesForm.filter((_, currentIndex) => currentIndex !== index),
      novoTelefoneForm,
    );

    if (telefoneRemovido?.id) {
      setTelefonesRemovidos((currentIds) => [...currentIds, telefoneRemovido.id!]);
    }

    setTelefonesForm(proximoEstado.telefones);
    setNovoTelefoneForm(proximoEstado.novoTelefone);
    setPerfilErroAcao("");
  }

  function handleRemoverNovoTelefone() {
    const proximoEstado = normalizarPrincipalTelefones(telefonesForm, null);

    setTelefonesForm(proximoEstado.telefones);
    setNovoTelefoneForm(null);
    setPerfilErroAcao("");
  }

  function handleEnderecoExistenteChange(
    index: number,
    field: keyof PerfilEnderecoFormState,
    value: string,
  ) {
    setEnderecosForm((currentData) =>
      currentData.map((endereco, currentIndex) =>
        currentIndex === index
          ? {
              ...endereco,
              [field]: normalizarValorEnderecoFormulario(field, value),
            }
          : endereco,
      ),
    );
    setPerfilErroAcao("");
  }

  function handleEnderecoPrincipalChange(index: number) {
    const proximoEstado = normalizarPrincipalEnderecos(
      enderecosForm.map((endereco, currentIndex) => ({
        ...endereco,
        isPrincipal: currentIndex === index,
      })),
      novoEnderecoForm ? { ...novoEnderecoForm, isPrincipal: false } : null,
    );

    setEnderecosForm(proximoEstado.enderecos);
    setNovoEnderecoForm(proximoEstado.novoEndereco);
    setPerfilErroAcao("");
  }

  function handleNovoEnderecoChange(
    field: keyof PerfilEnderecoFormState,
    value: string,
  ) {
    setNovoEnderecoForm((currentData) => ({
      ...(currentData ?? ENDERECO_FORM_INICIAL),
      [field]: normalizarValorEnderecoFormulario(field, value),
    }));
    setPerfilErroAcao("");
  }

  function handleNovoEnderecoPrincipalChange() {
    const proximoEstado = normalizarPrincipalEnderecos(enderecosForm, {
      ...(novoEnderecoForm ?? ENDERECO_FORM_INICIAL),
      isPrincipal: true,
    });

    setEnderecosForm(proximoEstado.enderecos);
    setNovoEnderecoForm(proximoEstado.novoEndereco);
    setPerfilErroAcao("");
  }

  function handleAdicionarTelefone() {
    const proximoEstado = normalizarPrincipalTelefones(telefonesForm, {
      ...TELEFONE_FORM_INICIAL,
      isPrincipal: telefonesForm.length === 0,
    });

    setNovoTelefoneForm(proximoEstado.novoTelefone);
    setTelefonesForm(proximoEstado.telefones);
    setPerfilErroAcao("");
  }

  function handleAdicionarEndereco() {
    const proximoEstado = normalizarPrincipalEnderecos(enderecosForm, {
      ...ENDERECO_FORM_INICIAL,
      isPrincipal: enderecosForm.length === 0,
    });

    setNovoEnderecoForm(proximoEstado.novoEndereco);
    setEnderecosForm(proximoEstado.enderecos);
    setPerfilErroAcao("");
  }

  async function handleAvatarSelecionado(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setAvatarErroAcao("Selecione um arquivo de imagem valido.");
      return;
    }

    if (file.size > MAX_AVATAR_FILE_SIZE) {
      setAvatarErroAcao("Escolha uma imagem de ate 2 MB.");
      return;
    }

    try {
      const dataUrl = await lerArquivoComoDataUrl(file);
      setAvatarPreview(dataUrl);
      setAvatarNomeArquivo(file.name);
      setAvatarErroAcao("");
    } catch (error) {
      setAvatarErroAcao(
        error instanceof Error ? error.message : "Nao foi possivel carregar a imagem.",
      );
    } finally {
      event.target.value = "";
    }
  }

  function handleRemoverAvatar() {
    setAvatarPreview("");
    setAvatarNomeArquivo("");
    setAvatarErroAcao("");
  }

  async function handleSalvarAvatar() {
    if (!usuario || isSalvandoAvatar) {
      return;
    }

    try {
      setIsSalvandoAvatar(true);
      setAvatarErroAcao("");
      const temNovaImagem = Boolean(avatarPreview);

      if (avatarDestino === "loja") {
        if (!loja) {
          fecharModal();
          return;
        }

        if (temNovaImagem) {
          saveStoredLojaAvatar(loja.id, avatarPreview);
          setAvatarLojaUrl(avatarPreview);
        } else {
          if (!avatarLojaUrl) {
            fecharModal();
            return;
          }

          removeStoredLojaAvatar(loja.id);
          setAvatarLojaUrl(loja.logoUrl?.trim() || loja.avatarUrl?.trim() || "");
        }

        fecharModal();
        alert(temNovaImagem ? "Foto da loja atualizada com sucesso!" : "Foto da loja removida com sucesso!");
        return;
      }

      if (temNovaImagem) {
        const response = await atualizarFotoPerfil({
          dataUrl: avatarPreview,
          nomeArquivo: avatarNomeArquivo || undefined,
        });

        const usuarioSessao = getStoredUser();
        updateStoredUser({
          nome: usuarioSessao?.nome ?? usuario.nome,
          email: usuarioSessao?.email ?? usuario.email,
          role: usuarioSessao?.role ?? "Usuario",
          avatarUrl: response.fotoPerfil.avatarUrl,
        });
      } else {
        if (!usuario.avatarUrl) {
          fecharModal();
          return;
        }

        await removerFotoPerfil();

        const usuarioSessao = getStoredUser();
        updateStoredUser({
          nome: usuarioSessao?.nome ?? usuario.nome,
          email: usuarioSessao?.email ?? usuario.email,
          role: usuarioSessao?.role ?? "Usuario",
          avatarUrl: null,
        });
      }

      fecharModal();
      recarregarDados();
      alert(temNovaImagem ? "Foto do perfil atualizada com sucesso!" : "Foto do perfil removida com sucesso!");
    } catch (error) {
      setAvatarErroAcao(
        error instanceof Error ? error.message : "Nao foi possivel salvar a foto.",
      );
    } finally {
      setIsSalvandoAvatar(false);
    }
  }

  function handleRemoverEndereco(index: number) {
    const enderecoRemovido = enderecosForm[index];
    const proximoEstado = normalizarPrincipalEnderecos(
      enderecosForm.filter((_, currentIndex) => currentIndex !== index),
      novoEnderecoForm,
    );

    if (enderecoRemovido?.id) {
      setEnderecosRemovidos((currentIds) => [...currentIds, enderecoRemovido.id!]);
    }

    setEnderecosForm(proximoEstado.enderecos);
    setNovoEnderecoForm(proximoEstado.novoEndereco);
    setPerfilErroAcao("");
  }

  function handleRemoverNovoEndereco() {
    const proximoEstado = normalizarPrincipalEnderecos(enderecosForm, null);

    setEnderecosForm(proximoEstado.enderecos);
    setNovoEnderecoForm(null);
    setPerfilErroAcao("");
  }

  function handleLojaInputChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;

    setLojaForm((currentData) => ({
      ...currentData,
      [name]: value,
    }));
    setLojaErroAcao("");
  }

  function handleLojaAtivaChange(event: ChangeEvent<HTMLInputElement>) {
    setLojaForm((currentData) => ({
      ...currentData,
      ativa: event.target.checked,
    }));
    setLojaErroAcao("");
  }

  function handleProdutoInputChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;

    setProdutoForm((currentData) => ({
      ...currentData,
      [name]: value,
    }));
    setProdutoConfirmandoExclusao(false);
    setProdutoErroAcao("");
  }

  function handleProdutoDisponivelChange(event: ChangeEvent<HTMLInputElement>) {
    setProdutoForm((currentData) => ({
      ...currentData,
      disponivel: event.target.checked,
    }));
    setProdutoConfirmandoExclusao(false);
    setProdutoErroAcao("");
  }

  async function handleProdutoImagemSelecionada(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setProdutoErroAcao("Selecione um arquivo de imagem valido para o produto.");
      return;
    }

    if (file.size > MAX_PRODUCT_IMAGE_FILE_SIZE) {
      setProdutoErroAcao("Escolha uma imagem de ate 2 MB para o produto.");
      return;
    }

    try {
      const dataUrl = await lerArquivoComoDataUrl(file);
      setProdutoForm((currentData) => ({
        ...currentData,
        imagemUrl: dataUrl,
      }));
      setProdutoImagemArquivo(file);
      setProdutoConfirmandoExclusao(false);
      setProdutoErroAcao("");
    } catch (error) {
      setProdutoErroAcao(
        error instanceof Error ? error.message : "Nao foi possivel carregar a imagem do produto.",
      );
    } finally {
      event.target.value = "";
    }
  }

  function handleRemoverImagemProduto() {
    setProdutoForm((currentData) => ({
      ...currentData,
      imagemUrl: "",
    }));
    setProdutoImagemArquivo(null);
    setProdutoConfirmandoExclusao(false);
    setProdutoErroAcao("");
  }

  function handleSolicitarRemocaoProdutoAtual() {
    if (!produtoForm.id || isProcessandoProduto) {
      return;
    }

    setProdutoConfirmandoExclusao(true);
    setProdutoErroAcao("");
    setLojaFeedback(null);
  }

  async function handleRemoverProdutoAtual() {
    if (!produtoForm.id || isProcessandoProduto) {
      return;
    }

    const nomeProduto = produtoForm.nome.trim() || "este produto";

    try {
      setIsRemovendoProduto(true);
      setProdutoErroAcao("");
      setLojaFeedback(null);

      await removerProduto(produtoForm.id);
      removeStoredProdutoImage(produtoForm.id);

      fecharModal();
      setAbaAtiva("produtos");
      recarregarDados();
      setLojaFeedback({
        tone: "success",
        message: `Produto "${nomeProduto}" excluido com sucesso. Ele nao aparece mais na vitrine, mas continua salvo no banco.`,
      });
    } catch (error) {
      setProdutoErroAcao(
        error instanceof Error ? error.message : "Nao foi possivel excluir o produto.",
      );
    } finally {
      setIsRemovendoProduto(false);
    }
  }

  async function handleSalvarProduto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isProcessandoProduto) {
      return;
    }

    try {
      setIsSalvandoProduto(true);
      setProdutoErroAcao("");

      if (!produtoForm.nome.trim()) {
        throw new Error("Informe o nome do produto.");
      }

      if (!produtoForm.categoria.trim()) {
        throw new Error("Informe a categoria do produto.");
      }

      const estoque = Number(produtoForm.estoque);

      if (!Number.isInteger(estoque) || estoque < 0) {
        throw new Error("Informe um estoque valido para o produto.");
      }

      const payload: ProdutoMutacaoPayload = {
        nome: produtoForm.nome.trim(),
        categoria: produtoForm.categoria.trim(),
        preco: normalizarPrecoParaApi(produtoForm.preco),
        estoque,
        disponivel: produtoForm.disponivel,
        descricao: produtoForm.descricao.trim() || undefined,
      };

      const produtoSalvo = produtoForm.id
        ? await atualizarProduto(produtoForm.id, payload)
        : await criarProduto(payload);

      const produtoIdPersistido = produtoSalvo?.id ?? produtoForm.id;

      if (produtoIdPersistido) {
        let imagemPersistidaPublicamente = false;

        if (produtoImagemArquivo) {
          const midiasPublicas = await enviarMidiasProduto(produtoIdPersistido, [produtoImagemArquivo]);
          const midiasConfirmadas =
            midiasPublicas.length > 0
              ? midiasPublicas
              : await listarMidiasProduto(produtoIdPersistido);

          if (midiasConfirmadas.length === 0) {
            throw new Error(
              "A API salvou os dados do produto, mas nao confirmou a imagem publica. Verifique o endpoint de midias da API.",
            );
          }

          saveStoredProdutoImage(produtoIdPersistido, midiasConfirmadas[0]);
          imagemPersistidaPublicamente = true;
        }

        if (imagemPersistidaPublicamente) {
          // Mantem a URL publica confirmada pela API.
        } else if (produtoForm.imagemUrl.trim()) {
          saveStoredProdutoImage(produtoIdPersistido, produtoForm.imagemUrl.trim());
        } else {
          removeStoredProdutoImage(produtoIdPersistido);
        }
      }

      fecharModal();
      setAbaAtiva("produtos");
      recarregarDados();
      alert(produtoForm.id ? "Produto atualizado com sucesso!" : "Produto criado com sucesso!");
    } catch (error) {
      setProdutoErroAcao(
        error instanceof Error ? error.message : "Nao foi possivel salvar o produto.",
      );
    } finally {
      setIsSalvandoProduto(false);
    }
  }

  async function handleSalvarPerfil(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!usuario || isSalvandoPerfil) {
      return;
    }

    try {
      setIsSalvandoPerfil(true);
      setPerfilErroAcao("");

      const payload = {
        nome: perfilForm.nome.trim(),
        sobrenome: perfilForm.sobrenome.trim(),
        email: perfilForm.email.trim().toLowerCase(),
        password: perfilForm.password.trim() || undefined,
      };

      const erroNovoEndereco = obterErroEnderecoInvalido(novoEnderecoForm);

      if (erroNovoEndereco) {
        throw new Error(erroNovoEndereco);
      }

      const totalTelefonesAposSalvar =
        telefonesForm.length + (telefoneTemConteudo(novoTelefoneForm) ? 1 : 0);

      if (totalTelefonesAposSalvar === 0) {
        throw new Error("Mantenha pelo menos um telefone cadastrado no perfil.");
      }

      const telefonesParaValidar = [
        ...telefonesForm,
        ...(telefoneTemConteudo(novoTelefoneForm) ? [novoTelefoneForm!] : []),
      ];

      if (encontrarTelefoneDuplicado(telefonesParaValidar)) {
        throw new Error("Esse numero de telefone ja esta cadastrado no perfil.");
      }

      const telefoneLojaRemovido =
        loja?.telefoneId != null && telefonesRemovidos.includes(loja.telefoneId);
      const telefoneSubstitutoId =
        telefonesForm.find((telefone) => telefone.isPrincipal && telefone.id)?.id ??
        telefonesForm.find((telefone) => telefone.id)?.id;
      const enderecoPrincipalId =
        enderecosForm.find((endereco) => endereco.isPrincipal && endereco.id)?.id ??
        enderecosForm.find((endereco) => endereco.id)?.id ??
        usuario.enderecoPrincipalId;

      if (telefoneLojaRemovido && !telefoneSubstitutoId) {
        throw new Error(
          "Nao e possivel remover o telefone usado pela loja sem manter outro telefone ja salvo no perfil.",
        );
      }

      if (telefoneLojaRemovido && !enderecoPrincipalId) {
        throw new Error(
          "Nao foi possivel atualizar a loja automaticamente porque nenhum endereco principal valido foi encontrado.",
        );
      }

      await atualizarPerfilUsuario(usuario.id, payload);

      await Promise.all(
        telefonesForm
          .filter((telefone) => telefone.id)
          .map((telefone) =>
            atualizarTelefone(
              telefone.id!,
              normalizarTelefoneParaApi(telefone.numero, telefone.isPrincipal),
            ),
          ),
      );

      await Promise.all(
        enderecosForm
          .filter((endereco) => endereco.id)
          .map((endereco) =>
            atualizarEndereco(usuario.id, endereco.id!, {
              cep: normalizarCep(endereco.cep),
              tipoLogradouro: endereco.tipoLogradouro,
              nomeEndereco: endereco.nomeEndereco.trim(),
              numero: endereco.numero.trim(),
              complemento: endereco.complemento.trim() || undefined,
              cidade: endereco.cidade.trim(),
              uf: endereco.uf.trim().toUpperCase(),
              isPrincipal: endereco.isPrincipal,
            }),
          ),
      );

      if (telefoneTemConteudo(novoTelefoneForm)) {
        await criarTelefone(
          normalizarTelefoneParaApi(novoTelefoneForm!.numero, novoTelefoneForm!.isPrincipal),
        );
      }

      if (novoEnderecoForm && enderecoTemConteudo(novoEnderecoForm)) {
        await criarEndereco(usuario.id, {
          cep: normalizarCep(novoEnderecoForm.cep),
          tipoLogradouro: novoEnderecoForm.tipoLogradouro,
          nomeEndereco: novoEnderecoForm.nomeEndereco.trim(),
          numero: novoEnderecoForm.numero.trim(),
          complemento: novoEnderecoForm.complemento.trim() || undefined,
          cidade: novoEnderecoForm.cidade.trim(),
          uf: novoEnderecoForm.uf.trim().toUpperCase(),
          isPrincipal: novoEnderecoForm.isPrincipal,
        });
      }

      if (loja && telefoneLojaRemovido) {
        await atualizarMinhaLoja({
          nomeFantasia: loja.nomeFantasia,
          tipoDocumentoFiscal: loja.tipoDocumentoFiscal,
          documentoFiscal: loja.documentoFiscal,
          descricao: loja.descricao ?? undefined,
          emailContato: loja.emailContato ?? undefined,
          usarEnderecoUsuario: true,
          enderecoUsuarioId: enderecoPrincipalId,
          usarTelefoneUsuario: true,
          telefoneUsuarioId: telefoneSubstitutoId,
          ativa: loja.ativa,
        });
      }

      await Promise.all(telefonesRemovidos.map((telefoneId) => removerTelefone(telefoneId)));
      await Promise.all(
        enderecosRemovidos.map((enderecoId) => removerEndereco(usuario.id, enderecoId)),
      );

      const usuarioSessao = getStoredUser();
      updateStoredUser({
        nome: `${payload.nome} ${payload.sobrenome}`.trim(),
        email: payload.email,
        role: usuarioSessao?.role ?? "Usuario",
        avatarUrl: usuarioSessao?.avatarUrl ?? usuario.avatarUrl ?? null,
      });

      fecharModal();
      recarregarDados();
      alert("Perfil atualizado com sucesso!");
    } catch (error) {
      setPerfilErroAcao(
        error instanceof Error ? error.message : "Nao foi possivel atualizar o perfil.",
      );
    } finally {
      setIsSalvandoPerfil(false);
    }
  }

  async function handleSalvarLoja(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!usuario || isSalvandoLoja) {
      return;
    }

    if (!usuario.enderecoPrincipalId || !usuario.telefonePrincipalId) {
      setLojaErroAcao(
        "Cadastre um telefone e um endereco principal no perfil antes de continuar.",
      );
      return;
    }

    try {
      setIsSalvandoLoja(true);
      setLojaErroAcao("");

      const payload = {
        nomeFantasia: lojaForm.nomeFantasia.trim(),
        tipoDocumentoFiscal: Number(lojaForm.tipoDocumentoFiscal) as TipoDocumentoFiscalLoja,
        documentoFiscal: lojaForm.documentoFiscal.trim(),
        descricao: lojaForm.descricao.trim() || undefined,
        emailContato: lojaForm.emailContato.trim() || undefined,
        usarEnderecoUsuario: true,
        enderecoUsuarioId: usuario.enderecoPrincipalId,
        usarTelefoneUsuario: true,
        telefoneUsuarioId: usuario.telefonePrincipalId,
        ativa: lojaForm.ativa,
      };

      if (loja) {
        await atualizarMinhaLoja(payload);
      } else {
        await criarMinhaLoja(payload);
      }

      fecharModal();
      recarregarDados();
      alert(loja ? "Loja atualizada com sucesso!" : "Loja criada com sucesso!");
    } catch (error) {
      setLojaErroAcao(obterMensagemErroLoja(error));
    } finally {
      setIsSalvandoLoja(false);
    }
  }

  return (
    <PageLayout>
      <div className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          {/* Apresenta o cabecalho principal da pagina com a mesma linguagem visual escura do projeto. */}
          <Spotlight>
            <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.14),_transparent_42%),linear-gradient(180deg,_rgba(255,255,255,0.04),_rgba(255,255,255,0.01))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-8">
              <div className="space-y-5">
                {temLoja ? (
                  <UserTabs
                    abaAtiva={visaoAtiva}
                    tabs={visoesDisponiveis}
                    onChange={(aba) => setVisaoAtiva(aba as PerfilVisaoId)}
                    withDivider={false}
                  />
                ) : null}

                <div className="space-y-3">
                <span className="inline-flex rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-1 text-sm font-medium text-yellow-300">
                  {heroBadge}
                </span>
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {heroTitulo}
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-neutral-400 sm:text-base">
                  {heroDescricao}
                </p>
              </div>
              </div>
            </section>
          </Spotlight>

          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="space-y-6">
              {/* Decide se a coluna esquerda mostra loading, erro ou os dados do usuario. */}
              {isUsuarioLoading ? (
                <ProfileSection>
                  <ProfileSkeleton lines={4} cardCount={1} />
                </ProfileSection>
              ) : usuarioError ? (
                <ProfileSection>
                  <ProfileFeedback
                    variant="error"
                    title="Erro ao carregar perfil"
                    description={usuarioError}
                  />
                </ProfileSection>
              ) : (
                <UserCard
                  card={cardAtivo}
                  onEditAvatar={abrirModalAvatar}
                  primaryAction={
                    visaoAtiva === "loja"
                      ? {
                          label: "Editar loja",
                          onClick: abrirModalLoja,
                          icon: <Store className="h-4 w-4" />,
                        }
                      : {
                          label: "Editar perfil",
                          onClick: abrirModalPerfil,
                          icon: <User className="h-4 w-4" />,
                        }
                  }
                  secondaryAction={
                    visaoAtiva === "loja"
                      ? {
                          label: "Entregas",
                          onClick: abrirModalEntregas,
                          icon: <Truck className="h-4 w-4" />,
                          variant: "secondary",
                        }
                      : {
                          label: temLoja ? "Editar loja" : "Criar loja",
                          onClick: abrirModalLoja,
                          icon: <Store className="h-4 w-4" />,
                          disabled: !podeGerenciarLoja,
                          variant: "secondary",
                        }
                  }
                />
              )}
            </div>

            <div className="space-y-6">
              {/* Exibe o resumo numerico da conta mesmo quando o usuario ainda nao possui dados completos. */}
              <UserStats
                title={visaoAtiva === "loja" ? "Desempenho da loja" : "Minha atividade"}
                description={
                  visaoAtiva === "loja"
                    ? "Resumo rapido da operacao da loja para orientar vitrine, vendas e receita."
                    : "Resumo rapido da conta de comprador com seus dados principais."
                }
                stats={statsAtivos}
              />

              <ProfileSection title={tabContent.titulo} description={tabContent.descricao}>
                {/* Controla a troca de abas e o recarregamento dinamico do conteudo. */}
                <div className="space-y-5">
                  <div className="space-y-4 border-b border-white/10 pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <UserTabs
                        abaAtiva={abaAtivaResolvida}
                        tabs={abasDisponiveis}
                        onChange={(aba) => setAbaAtiva(aba as PerfilTabId)}
                        withDivider={false}
                        className="flex-1"
                      />

                      {visaoAtiva === "loja" ? (
                        <div className="flex items-center gap-2">
                          {isStoreProductsTab && categoriasDaLoja.length > 0 ? (
                            <button
                              type="button"
                              onClick={handleAlternarModoExclusaoCategorias}
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 ${
                                categoriaLojaModoExclusao
                                  ? "border-red-400/40 bg-red-400/10 text-red-200"
                                  : "border-white/10 bg-black/40 text-neutral-300 hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-200"
                              }`.trim()}
                              aria-label={
                                categoriaLojaModoExclusao
                                  ? "Desativar modo de exclusao de categorias"
                                  : "Ativar modo de exclusao de categorias"
                              }
                              title={
                                categoriaLojaModoExclusao
                                  ? "Desativar modo de exclusao de categorias"
                                  : "Ativar modo de exclusao de categorias"
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => abrirModalProduto()}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-yellow-400/30 bg-yellow-400/10 text-yellow-300 transition hover:border-yellow-400/50 hover:bg-yellow-400/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60"
                            aria-label="Adicionar produto"
                            title="Adicionar produto"
                          >
                            <Plus className="h-5 w-5" />
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {isStoreProductsTab ? (
                      <div className="space-y-3">
                        {lojaFeedback ? (
                          <div
                            className={`rounded-2xl border px-4 py-3 text-sm ${
                              lojaFeedback.tone === "success"
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                                : "border-red-500/20 bg-red-500/10 text-red-200"
                            }`.trim()}
                          >
                            {lojaFeedback.message}
                          </div>
                        ) : null}

                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-white">Categorias da loja</p>
                            <p className="text-xs text-neutral-400">
                              Filtre os produtos pelas categorias ja cadastradas na sua vitrine.
                            </p>
                          </div>
                        </div>

                        {categoriaLojaModoExclusao ? (
                          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                            Clique no <span className="font-semibold text-red-200">X</span> da
                            categoria que deseja excluir da vitrine.
                          </div>
                        ) : null}

                        {categoriaLojaPendenteExclusao ? (
                          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
                            <p className="font-medium text-red-200">Confirmar exclusao da categoria</p>
                            <p className="mt-2">
                              {criarMensagemConfirmacaoExclusaoCategoria(
                                categoriaLojaPendenteExclusao,
                              )}
                            </p>

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                              <Botao
                                type="button"
                                variant="secondary"
                                disabled={Boolean(categoriaLojaRemovendoId)}
                                onClick={() => setCategoriaLojaPendenteExclusao(null)}
                                className="h-11 sm:w-auto sm:px-6"
                              >
                                Cancelar
                              </Botao>

                              <Botao
                                type="button"
                                disabled={Boolean(categoriaLojaRemovendoId)}
                                onClick={() => void handleRemoverCategoriaLoja()}
                                className="h-11 border-red-400/20 bg-red-500/80 text-white hover:bg-red-500 sm:w-auto sm:px-6"
                                icon={<Trash2 className="h-4 w-4" />}
                              >
                                {categoriaLojaRemovendoId === categoriaLojaPendenteExclusao.id
                                  ? "Excluindo categoria..."
                                  : "Excluir categoria"}
                              </Botao>
                            </div>
                          </div>
                        ) : null}

                        {categoriasDaLoja.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setCategoriaLojaAtiva("todas")}
                              className={`rounded-full border px-3 py-2 text-sm transition ${
                                categoriaLojaAtiva === "todas"
                                  ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-300"
                                  : "border-white/10 bg-black text-neutral-400 hover:border-white/20 hover:text-white"
                              }`.trim()}
                            >
                              Todas
                            </button>

                            {categoriasDaLoja.map((categoria) => {
                              const categoriaAtiva = categoriaLojaAtiva === categoria.id;
                              const categoriaRemovendo = categoriaLojaRemovendoId === categoria.id;

                              return (
                                <div
                                  key={categoria.id}
                                  className={`flex items-center overflow-hidden rounded-full border transition ${
                                    categoriaAtiva
                                      ? "border-yellow-400/40 bg-yellow-400/10"
                                      : "border-white/10 bg-black"
                                  }`.trim()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => setCategoriaLojaAtiva(categoria.id)}
                                    className={`px-3 py-2 text-sm transition ${
                                      categoriaAtiva
                                        ? "text-yellow-300"
                                        : "text-neutral-400 hover:text-white"
                                    }`.trim()}
                                  >
                                    {categoria.nome}{" "}
                                    <span className="text-xs text-neutral-500">
                                      ({categoria.totalProdutos})
                                    </span>
                                  </button>

                                  {categoriaLojaModoExclusao ? (
                                    <button
                                      type="button"
                                      onClick={() => handleSolicitarRemocaoCategoriaLoja(categoria)}
                                      disabled={categoriaRemovendo}
                                      className={`border-l px-3 py-2 transition ${
                                        categoriaAtiva
                                          ? "border-yellow-400/20 text-red-200 hover:bg-red-400/15"
                                          : "border-white/10 text-red-300 hover:bg-red-400/10"
                                      } ${categoriaRemovendo ? "cursor-not-allowed opacity-60" : ""}`.trim()}
                                      aria-label={`Selecionar exclusao da categoria ${categoria.nome}`}
                                      title={`Selecionar exclusao da categoria ${categoria.nome}`}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-neutral-500">
                            As categorias vao aparecer aqui assim que houver produtos publicados.
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* Renderiza feedback visual adequado para cada estado da listagem. */}
                  {isConteudoLoading ? (
                    <ProfileSkeleton />
                  ) : conteudoError ? (
                    <ProfileFeedback
                      variant="error"
                      title="Erro ao carregar conteudo"
                      description={conteudoError}
                    />
                  ) : itensExibidos.length === 0 ? (
                    <ProfileFeedback
                      variant="empty"
                      title={
                        estaFiltrandoCategoria
                          ? "Nenhum produto nessa categoria"
                          : tabContent.vazioTitulo
                      }
                      description={
                        estaFiltrandoCategoria
                          ? "Selecione outra categoria ou adicione um novo produto para preencher essa secao."
                          : tabContent.vazioDescricao
                      }
                    />
                  ) : (
                    <ProductGrid
                      itens={itensExibidos}
                      onItemClick={isStoreProductsTab ? abrirModalProduto : undefined}
                    />
                  )}
                </div>
              </ProfileSection>
            </div>
          </div>
        </div>
      </div>

      <ProfileModal
        isOpen={modalAberto === "avatar"}
        title={tituloModalAvatar}
        description={descricaoModalAvatar}
        onClose={fecharModal}
      >
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 text-center">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt={altPreviewAvatar}
                className="h-32 w-32 rounded-full border-4 border-yellow-400 object-cover"
              />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-dashed border-yellow-400/40 bg-black text-sm font-medium text-neutral-400">
                {editandoFotoLoja ? "Sem foto da loja" : "Sem foto"}
              </div>
            )}

            <label className="w-full cursor-pointer rounded-2xl border border-dashed border-yellow-400/30 bg-yellow-400/10 px-4 py-5 text-sm text-yellow-100 transition hover:border-yellow-400/50 hover:bg-yellow-400/15">
              <div className="flex flex-col items-center gap-3">
                <ImagePlus className="h-6 w-6" />
                <div className="space-y-1">
                  <p className="font-medium text-white">
                    {editandoFotoLoja ? "Selecionar imagem da loja" : "Selecionar imagem"}
                  </p>
                  <p className="text-xs text-neutral-300">
                    PNG, JPG ou WebP com ate 2 MB
                  </p>
                </div>
              </div>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarSelecionado}
              />
            </label>
          </div>

          {avatarErroAcao ? <p className="text-sm text-red-400">{avatarErroAcao}</p> : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Botao
                type="button"
                variant="secondary"
                onClick={fecharModal}
                className="h-11 sm:w-auto sm:px-6"
              >
                Cancelar
              </Botao>

              <Botao
                type="button"
                variant="secondary"
                onClick={handleRemoverAvatar}
                className="h-11 border-red-400/20 bg-red-400/10 text-red-200 hover:bg-red-400/20 sm:w-auto sm:px-6"
                icon={<Trash2 className="h-4 w-4" />}
              >
                {labelRemoverAvatar}
              </Botao>
            </div>

            <Botao
              type="button"
              disabled={isSalvandoAvatar}
              onClick={handleSalvarAvatar}
              className="h-11 sm:w-auto sm:px-6"
            >
              {isSalvandoAvatar ? "Salvando..." : labelSalvarAvatar}
            </Botao>
          </div>
        </div>
      </ProfileModal>

      <ProfileModal
        isOpen={modalAberto === "perfil"}
        title="Editar perfil"
        description="Atualize os dados basicos da sua conta sem sair da pagina de perfil."
        onClose={fecharModal}
      >
        <form className="space-y-5" onSubmit={handleSalvarPerfil}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nome"
              id="nome"
              name="nome"
              placeholder="Seu nome"
              value={perfilForm.nome}
              onChange={handlePerfilInputChange}
              icon={<User className="h-5 w-5" />}
              required
            />

            <Input
              label="Sobrenome"
              id="sobrenome"
              name="sobrenome"
              placeholder="Seu sobrenome"
              value={perfilForm.sobrenome}
              onChange={handlePerfilInputChange}
              icon={<User className="h-5 w-5" />}
              required
            />
          </div>

          <Input
            label="Email"
            id="email"
            name="email"
            type="email"
            placeholder="voce@exemplo.com"
            value={perfilForm.email}
            onChange={handlePerfilInputChange}
            icon={<Mail className="h-5 w-5" />}
            required
          />

          <Input
            label="Nova senha (opcional)"
            id="password"
            name="password"
            type="password"
            placeholder="Preencha apenas se quiser trocar a senha"
            value={perfilForm.password}
            onChange={handlePerfilInputChange}
            icon={<LockIcon className="h-5 w-5" />}
          />

          <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white">Telefones</h3>
                <p className="text-sm text-neutral-400">
                  Edite os telefones cadastrados e adicione mais um se precisar.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAdicionarTelefone}
                disabled={Boolean(novoTelefoneForm)}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                  novoTelefoneForm
                    ? "cursor-not-allowed border-white/10 bg-white/5 text-neutral-600"
                    : "border-yellow-400/30 bg-yellow-400/10 text-yellow-300 hover:border-yellow-400/50 hover:bg-yellow-400/20"
                }`}
                aria-label="Adicionar telefone"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {telefonesForm.map((telefone, index) => (
                <div
                  key={telefone.id ?? `telefone-${index}`}
                  className="rounded-2xl border border-white/10 bg-black/40 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <Phone className="h-4 w-4 text-yellow-400" />
                      <span>Telefone {index + 1}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-200">
                        <input
                          type="checkbox"
                          checked={telefone.isPrincipal}
                          onChange={() => handleTelefonePrincipalChange(index)}
                          className="h-3.5 w-3.5 cursor-pointer accent-yellow-500"
                        />
                        Principal
                      </label>

                      <button
                        type="button"
                        onClick={() => handleRemoverTelefone(index)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-400/20 bg-red-400/10 text-red-300 transition hover:border-red-400/40 hover:bg-red-400/20"
                        aria-label={`Remover telefone ${index + 1}`}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <Input
                    label="Numero"
                    id={`telefone-${index}`}
                    name={`telefone-${index}`}
                    placeholder="(11) 97777-7932"
                    value={telefone.numero}
                    onChange={(event) => handleTelefoneExistenteChange(index, event.target.value)}
                    required
                  />
                </div>
              ))}

              {novoTelefoneForm ? (
                <div className="rounded-2xl border border-dashed border-yellow-400/25 bg-yellow-400/5 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <Plus className="h-4 w-4 text-yellow-400" />
                      <span>Novo telefone</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-200">
                        <input
                          type="checkbox"
                          checked={novoTelefoneForm.isPrincipal}
                          onChange={handleNovoTelefonePrincipalChange}
                          className="h-3.5 w-3.5 cursor-pointer accent-yellow-500"
                        />
                        Principal
                      </label>

                      <button
                        type="button"
                        onClick={handleRemoverNovoTelefone}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-400/20 bg-red-400/10 text-red-300 transition hover:border-red-400/40 hover:bg-red-400/20"
                        aria-label="Remover novo telefone"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <Input
                    label="Numero"
                    id="novo-telefone"
                    name="novoTelefone"
                    placeholder="(11) 97777-7932"
                    value={novoTelefoneForm.numero}
                    onChange={(event) => handleNovoTelefoneChange(event.target.value)}
                  />
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white">Enderecos</h3>
                <p className="text-sm text-neutral-400">
                  Revise os enderecos atuais e use o `+` para abrir mais um cadastro.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAdicionarEndereco}
                disabled={Boolean(novoEnderecoForm)}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                  novoEnderecoForm
                    ? "cursor-not-allowed border-white/10 bg-white/5 text-neutral-600"
                    : "border-yellow-400/30 bg-yellow-400/10 text-yellow-300 hover:border-yellow-400/50 hover:bg-yellow-400/20"
                }`}
                aria-label="Adicionar endereco"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {enderecosForm.map((endereco, index) => (
                <div
                  key={endereco.id ?? `endereco-${index}`}
                  className="rounded-2xl border border-white/10 bg-black/40 p-4"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <MapPin className="h-4 w-4 text-yellow-400" />
                      <span>Endereco {index + 1}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-200">
                        <input
                          type="checkbox"
                          checked={endereco.isPrincipal}
                          onChange={() => handleEnderecoPrincipalChange(index)}
                          className="h-3.5 w-3.5 cursor-pointer accent-yellow-500"
                        />
                        Principal
                      </label>

                      <button
                        type="button"
                        onClick={() => handleRemoverEndereco(index)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-400/20 bg-red-400/10 text-red-300 transition hover:border-red-400/40 hover:bg-red-400/20"
                        aria-label={`Remover endereco ${index + 1}`}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor={`tipoLogradouro-${index}`}
                        className="text-[#6b6b6b]"
                      >
                        Tipo de logradouro
                      </label>
                      <select
                        id={`tipoLogradouro-${index}`}
                        value={endereco.tipoLogradouro}
                        onChange={(event) =>
                          handleEnderecoExistenteChange(
                            index,
                            "tipoLogradouro",
                            event.target.value,
                          )
                        }
                        className="w-full rounded-xl border border-[#6B6B6B] bg-black p-2 text-white outline-none transition focus:border-yellow-400"
                      >
                        {tiposLogradouro.map((tipo) => (
                          <option key={tipo.codigo} value={tipo.codigo}>
                            {tipo.descricao}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Input
                      label="Nome do endereco"
                      id={`nomeEndereco-${index}`}
                      name={`nomeEndereco-${index}`}
                      autoComplete="off"
                      value={endereco.nomeEndereco}
                      onChange={(event) =>
                        handleEnderecoExistenteChange(index, "nomeEndereco", event.target.value)
                      }
                      required
                    />

                    <Input
                      label="Numero"
                      id={`numeroEndereco-${index}`}
                      name={`numeroEndereco-${index}`}
                      autoComplete="off"
                      value={endereco.numero}
                      onChange={(event) =>
                        handleEnderecoExistenteChange(index, "numero", event.target.value)
                      }
                      required
                    />

                    <Input
                      label="Complemento"
                      id={`complementoEndereco-${index}`}
                      name={`complementoEndereco-${index}`}
                      autoComplete="off"
                      value={endereco.complemento}
                      onChange={(event) =>
                        handleEnderecoExistenteChange(index, "complemento", event.target.value)
                      }
                    />

                    <Input
                      label="CEP"
                      id={`cepEndereco-${index}`}
                      name={`cepEndereco-${index}`}
                      autoComplete="off"
                      inputMode="numeric"
                      value={endereco.cep}
                      onChange={(event) =>
                        handleEnderecoExistenteChange(index, "cep", event.target.value)
                      }
                      required
                    />

                    <Input
                      label="Cidade"
                      id={`cidadeEndereco-${index}`}
                      name={`cidadeEndereco-${index}`}
                      autoComplete="off"
                      value={endereco.cidade}
                      onChange={(event) =>
                        handleEnderecoExistenteChange(index, "cidade", event.target.value)
                      }
                      required
                    />

                    <Input
                      label="UF"
                      id={`ufEndereco-${index}`}
                      name={`ufEndereco-${index}`}
                      autoComplete="off"
                      value={endereco.uf}
                      onChange={(event) =>
                        handleEnderecoExistenteChange(index, "uf", event.target.value.toUpperCase())
                      }
                      maxLength={2}
                      required
                    />
                  </div>
                </div>
              ))}

              {novoEnderecoForm ? (
                <div className="rounded-2xl border border-dashed border-yellow-400/25 bg-yellow-400/5 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3 text-sm font-medium text-white">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-yellow-400" />
                      <span>Novo endereco</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-200">
                        <input
                          type="checkbox"
                          checked={novoEnderecoForm.isPrincipal}
                          onChange={handleNovoEnderecoPrincipalChange}
                          className="h-3.5 w-3.5 cursor-pointer accent-yellow-500"
                        />
                        Principal
                      </label>

                      <button
                        type="button"
                        onClick={handleRemoverNovoEndereco}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-400/20 bg-red-400/10 text-red-300 transition hover:border-red-400/40 hover:bg-red-400/20"
                        aria-label="Remover novo endereco"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="novoTipoLogradouro" className="text-[#6b6b6b]">
                        Tipo de logradouro
                      </label>
                      <select
                        id="novoTipoLogradouro"
                        value={novoEnderecoForm.tipoLogradouro}
                        onChange={(event) =>
                          handleNovoEnderecoChange("tipoLogradouro", event.target.value)
                        }
                        className="w-full rounded-xl border border-[#6B6B6B] bg-black p-2 text-white outline-none transition focus:border-yellow-400"
                      >
                        {tiposLogradouro.map((tipo) => (
                          <option key={tipo.codigo} value={tipo.codigo}>
                            {tipo.descricao}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Input
                      label="Nome do endereco"
                      id="novoNomeEndereco"
                      name="novoNomeEndereco"
                      autoComplete="off"
                      value={novoEnderecoForm.nomeEndereco}
                      onChange={(event) =>
                        handleNovoEnderecoChange("nomeEndereco", event.target.value)
                      }
                    />

                    <Input
                      label="Numero"
                      id="novoNumeroEndereco"
                      name="novoNumeroEndereco"
                      autoComplete="off"
                      value={novoEnderecoForm.numero}
                      onChange={(event) =>
                        handleNovoEnderecoChange("numero", event.target.value)
                      }
                    />

                    <Input
                      label="Complemento"
                      id="novoComplementoEndereco"
                      name="novoComplementoEndereco"
                      autoComplete="off"
                      value={novoEnderecoForm.complemento}
                      onChange={(event) =>
                        handleNovoEnderecoChange("complemento", event.target.value)
                      }
                    />

                    <Input
                      label="CEP"
                      id="novoCepEndereco"
                      name="novoCepEndereco"
                      autoComplete="off"
                      inputMode="numeric"
                      value={novoEnderecoForm.cep}
                      onChange={(event) => handleNovoEnderecoChange("cep", event.target.value)}
                    />

                    <Input
                      label="Cidade"
                      id="novaCidadeEndereco"
                      name="novaCidadeEndereco"
                      autoComplete="off"
                      value={novoEnderecoForm.cidade}
                      onChange={(event) =>
                        handleNovoEnderecoChange("cidade", event.target.value)
                      }
                    />

                    <Input
                      label="UF"
                      id="novaUfEndereco"
                      name="novaUfEndereco"
                      autoComplete="off"
                      value={novoEnderecoForm.uf}
                      onChange={(event) =>
                        handleNovoEnderecoChange("uf", event.target.value.toUpperCase())
                      }
                      maxLength={2}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {perfilErroAcao ? <p className="text-sm text-red-400">{perfilErroAcao}</p> : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Botao
              type="button"
              variant="secondary"
              onClick={fecharModal}
              className="h-11 sm:w-auto sm:px-6"
            >
              Cancelar
            </Botao>

            <Botao
              type="submit"
              disabled={isSalvandoPerfil}
              className="h-11 sm:w-auto sm:px-6"
            >
              {isSalvandoPerfil ? "Salvando..." : "Salvar perfil"}
            </Botao>
          </div>
        </form>
      </ProfileModal>

      <ProfileModal
        isOpen={modalAberto === "entregas"}
        title={tituloModalEntregas}
        description={descricaoModalEntregas}
        onClose={fecharModal}
      >
        <div className="space-y-5">
          <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Entregas cadastradas</h3>
                <p className="text-sm text-neutral-400">
                  Edite as modalidades da sua loja ou crie uma nova opcao de frete.
                </p>
              </div>

              <Botao
                type="button"
                variant="secondary"
                onClick={handleNovaEntrega}
                className="h-11 sm:w-auto sm:px-5"
                icon={<Plus className="h-4 w-4" />}
              >
                Nova opcao
              </Botao>
            </div>

            {isCarregandoEntregas ? (
              <ProfileSkeleton lines={3} cardCount={2} />
            ) : entregasLoja.length > 0 ? (
              <div className="space-y-3">
                {entregasLoja.map((opcao) => {
                  const estaEditando = entregaLojaForm.id === opcao.id;
                  const estaRemovendo = entregaRemovendoId === opcao.id;

                  return (
                    <div
                      key={opcao.id}
                      className={`rounded-2xl border p-4 transition ${
                        estaEditando
                          ? "border-yellow-400/40 bg-yellow-400/10"
                          : "border-white/10 bg-black/40"
                      }`.trim()}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/25 bg-yellow-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-yellow-300">
                              <Truck className="h-3.5 w-3.5" />
                              {obterTipoEntregaLabel(opcao.tipoEntregaId)}
                            </span>

                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                                opcao.ativa
                                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                                  : "border-white/10 bg-white/5 text-neutral-400"
                              }`.trim()}
                            >
                              {opcao.ativa ? "Ativa" : "Pausada"}
                            </span>
                          </div>

                          <div>
                            <p className="text-base font-semibold text-white">{opcao.nome}</p>
                            <p className="text-sm text-neutral-400">{opcao.resumoCobertura}</p>
                          </div>

                          {opcao.observacao?.trim() ? (
                            <p className="text-sm text-neutral-500">{opcao.observacao}</p>
                          ) : null}
                        </div>

                        <div className="flex flex-col gap-3 sm:items-end">
                          <div className="text-sm text-neutral-300">
                            <span className="font-medium text-white">{formatarMoeda(opcao.valorFrete)}</span>
                            {" · "}
                            prazo de {opcao.prazoEntregaDias} dia(s)
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditarEntrega(opcao)}
                              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                void handleRemoverEntregaLoja(opcao);
                              }}
                              disabled={estaRemovendo}
                              className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200 transition hover:border-red-400/40 hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {estaRemovendo ? "Removendo..." : "Excluir"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-yellow-400/25 bg-yellow-400/5 px-4 py-5 text-sm text-zinc-300">
                Nenhuma opcao de entrega foi cadastrada ainda. Use o formulario abaixo para criar a primeira.
              </div>
            )}
          </section>

          <form className="space-y-5" onSubmit={handleSalvarEntregaLoja}>
            <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {entregaEmEdicao ? "Editar opcao de entrega" : "Nova opcao de entrega"}
                  </h3>
                  <p className="text-sm text-neutral-400">
                    Defina a modalidade, o frete e o prazo exibidos no checkout da loja.
                  </p>
                </div>

                {entregaEmEdicao ? (
                  <Botao
                    type="button"
                    variant="secondary"
                    onClick={handleCancelarEntrega}
                    className="h-11 sm:w-auto sm:px-5"
                  >
                    Nova opcao
                  </Botao>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="tipoEntregaId" className="text-[#6b6b6b]">
                    Tipo de entrega
                  </label>
                  <select
                    id="tipoEntregaId"
                    name="tipoEntregaId"
                    value={entregaLojaForm.tipoEntregaId}
                    onChange={handleEntregaInputChange}
                    className="w-full rounded-xl border border-[#6B6B6B] bg-black p-2 text-white outline-none transition focus:border-yellow-400"
                  >
                    {TIPOS_ENTREGA_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Nome exibido"
                  id="entregaNome"
                  name="nome"
                  placeholder="Entrega expressa"
                  value={entregaLojaForm.nome}
                  onChange={handleEntregaInputChange}
                  required
                />

                <Input
                  label="Valor do frete"
                  id="entregaValorFrete"
                  name="valorFrete"
                  placeholder="12,90"
                  value={entregaLojaForm.valorFrete}
                  onChange={handleEntregaInputChange}
                  disabled={tipoEntregaAtualEhRetirada}
                  required
                />

                <Input
                  label="Prazo em dias"
                  id="entregaPrazoEntregaDias"
                  name="prazoEntregaDias"
                  type="number"
                  min="0"
                  max="365"
                  value={entregaLojaForm.prazoEntregaDias}
                  onChange={handleEntregaInputChange}
                  required
                />
              </div>

              {tipoEntregaAtualEhRetirada ? (
                <p className="text-xs text-neutral-500">
                  A modalidade Retirada usa frete zero automaticamente.
                </p>
              ) : null}

              <div className="space-y-2">
                <label htmlFor="entregaObservacao" className="text-[#6b6b6b]">
                  Observacao
                </label>
                <textarea
                  id="entregaObservacao"
                  name="observacao"
                  rows={3}
                  value={entregaLojaForm.observacao}
                  onChange={handleEntregaInputChange}
                  placeholder="Ex.: Entregas para a capital em horario comercial."
                  className="w-full rounded-xl border border-[#6B6B6B] bg-black p-3 text-white placeholder-[#6b6b6b] outline-none transition focus:border-yellow-400"
                />
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-neutral-200">
                <input
                  type="checkbox"
                  checked={entregaLojaForm.ativa}
                  onChange={handleEntregaAtivaChange}
                  className="h-4 w-4 cursor-pointer accent-yellow-500"
                />
                Opcao ativa no checkout da loja
              </label>
            </section>

            {entregaErroAcao ? <p className="text-sm text-red-400">{entregaErroAcao}</p> : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Botao
                type="button"
                variant="secondary"
                onClick={fecharModal}
                className="h-11 sm:w-auto sm:px-6"
              >
                Fechar
              </Botao>

              <Botao
                type="submit"
                disabled={isSalvandoEntrega}
                className="h-11 sm:w-auto sm:px-6"
                icon={<PackageCheck className="h-4 w-4" />}
              >
                {isSalvandoEntrega
                  ? "Salvando..."
                  : entregaEmEdicao
                    ? "Salvar entrega"
                    : "Criar entrega"}
              </Botao>
            </div>
          </form>
        </div>
      </ProfileModal>

      <ProfileModal
        isOpen={modalAberto === "produto"}
        title={tituloModalProduto}
        description={descricaoModalProduto}
        onClose={fecharModal}
      >
        <form className="space-y-5" onSubmit={handleSalvarProduto}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nome do produto"
              id="produtoNome"
              name="nome"
              placeholder="Mouse Gamer RGB"
              value={produtoForm.nome}
              onChange={handleProdutoInputChange}
              required
            />

            <Input
              label="Categoria"
              id="produtoCategoria"
              name="categoria"
              placeholder="Perifericos"
              value={produtoForm.categoria}
              onChange={handleProdutoInputChange}
              required
            />

            <Input
              label="Preco"
              id="produtoPreco"
              name="preco"
              placeholder="100,99"
              value={produtoForm.preco}
              onChange={handleProdutoInputChange}
              required
            />

            <Input
              label="Estoque"
              id="produtoEstoque"
              name="estoque"
              type="number"
              min="0"
              placeholder="10"
              value={produtoForm.estoque}
              onChange={handleProdutoInputChange}
              required
            />
          </div>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">Imagem principal</p>
                <p className="text-xs text-neutral-400">
                  Envie uma foto do produto em PNG, JPG ou WebP com ate 2 MB.
                </p>
              </div>

              {produtoForm.imagemUrl ? (
                <button
                  type="button"
                  onClick={handleRemoverImagemProduto}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-400/20 bg-red-400/10 text-red-300 transition hover:border-red-400/40 hover:bg-red-400/20"
                  aria-label="Remover imagem do produto"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
              <div className="flex h-40 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                {produtoForm.imagemUrl ? (
                  <img
                    src={produtoForm.imagemUrl}
                    alt={`Preview do produto ${produtoForm.nome || "selecionado"}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="px-4 text-center text-xs uppercase tracking-[0.22em] text-neutral-500">
                    Sem imagem
                  </span>
                )}
              </div>

              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-yellow-400/30 bg-yellow-400/10 px-4 py-6 text-center text-sm text-yellow-100 transition hover:border-yellow-400/50 hover:bg-yellow-400/15">
                <ImagePlus className="h-6 w-6" />
                <div className="space-y-1">
                  <p className="font-medium text-white">Selecionar foto do produto</p>
                  <p className="text-xs text-neutral-300">
                    O arquivo escolhido ja sera usado no cadastro.
                  </p>
                </div>

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProdutoImagemSelecionada}
                />
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="produtoDescricao" className="text-[#6b6b6b]">
              Descricao
            </label>
            <textarea
              id="produtoDescricao"
              name="descricao"
              value={produtoForm.descricao}
              onChange={handleProdutoInputChange}
              placeholder="Descreva o produto para destacar os principais diferenciais."
              rows={4}
              className="w-full rounded-xl border border-[#6B6B6B] bg-black p-3 text-white outline-none transition focus:border-yellow-400"
            />
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-neutral-200">
            <input
              type="checkbox"
              checked={produtoForm.disponivel}
              onChange={handleProdutoDisponivelChange}
              className="h-4 w-4 cursor-pointer accent-yellow-500"
            />
            Produto disponivel para venda
          </label>

          {produtoErroAcao ? <p className="text-sm text-red-400">{produtoErroAcao}</p> : null}

          {produtoForm.id && produtoConfirmandoExclusao ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
              <p className="font-medium text-red-200">Confirmar exclusao do produto</p>
              <p className="mt-2">
                O produto "{produtoForm.nome.trim() || "selecionado"}" deixara de aparecer para os
                usuarios, mas continuara salvo no banco.
              </p>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Botao
                type="button"
                variant="secondary"
                onClick={fecharModal}
                className="h-11 sm:w-auto sm:px-6"
              >
                Cancelar
              </Botao>

              {produtoForm.id ? (
                produtoConfirmandoExclusao ? (
                  <>
                    <Botao
                      type="button"
                      variant="secondary"
                      disabled={isProcessandoProduto}
                      onClick={() => setProdutoConfirmandoExclusao(false)}
                      className="h-11 sm:w-auto sm:px-6"
                    >
                      Voltar
                    </Botao>

                    <Botao
                      type="button"
                      disabled={isProcessandoProduto}
                      onClick={() => void handleRemoverProdutoAtual()}
                      className="h-11 border-red-400/20 bg-red-500/80 text-white hover:bg-red-500 sm:w-auto sm:px-6"
                      icon={<Trash2 className="h-4 w-4" />}
                    >
                      {isRemovendoProduto ? "Excluindo..." : "Confirmar exclusao"}
                    </Botao>
                  </>
                ) : (
                  <Botao
                    type="button"
                    variant="secondary"
                    disabled={isProcessandoProduto}
                    onClick={handleSolicitarRemocaoProdutoAtual}
                    className="h-11 border-red-400/20 bg-red-400/10 text-red-200 hover:bg-red-400/20 sm:w-auto sm:px-6"
                    icon={<Trash2 className="h-4 w-4" />}
                  >
                    Excluir produto
                  </Botao>
                )
              ) : null}
            </div>

            {!produtoConfirmandoExclusao ? (
              <Botao
                type="submit"
                disabled={isProcessandoProduto}
                className="h-11 sm:w-auto sm:px-6"
              >
                {isSalvandoProduto
                  ? "Salvando..."
                  : produtoForm.id
                    ? "Salvar produto"
                    : "Criar produto"}
              </Botao>
            ) : null}
          </div>
        </form>
      </ProfileModal>

      <ProfileModal
        isOpen={modalAberto === "loja"}
        title={temLoja ? "Editar loja" : "Criar loja"}
        description="Use seus dados principais de endereco e telefone para liberar a loja rapidamente."
        onClose={fecharModal}
      >
        <form className="space-y-5" onSubmit={handleSalvarLoja}>
          <div className="grid gap-4 sm:grid-cols-1">
            <Input
              label="Nome fantasia"
              id="nomeFantasia"
              name="nomeFantasia"
              placeholder="Nome da sua loja"
              value={lojaForm.nomeFantasia}
              onChange={handleLojaInputChange}
              icon={<Store className="h-5 w-5" />}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="tipoDocumentoFiscal" className="text-[#6b6b6b]">
                Tipo do documento
              </label>
              <select
                id="tipoDocumentoFiscal"
                name="tipoDocumentoFiscal"
                value={lojaForm.tipoDocumentoFiscal}
                onChange={handleLojaInputChange}
                className="w-full rounded-xl border border-[#6B6B6B] bg-black p-2 text-white outline-none transition focus:border-yellow-400"
              >
                <option value="1">CPF</option>
                <option value="2">CNPJ</option>
              </select>
            </div>

            <Input
              label="Documento fiscal"
              id="documentoFiscal"
              name="documentoFiscal"
              placeholder={lojaForm.tipoDocumentoFiscal === "2" ? "00.000.000/0000-00" : "000.000.000-00"}
              value={lojaForm.documentoFiscal}
              onChange={handleLojaInputChange}
              required
            />
          </div>

          <Input
            label="Email de contato"
            id="emailContato"
            name="emailContato"
            type="email"
            placeholder="loja@exemplo.com"
            value={lojaForm.emailContato}
            onChange={handleLojaInputChange}
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="descricao" className="text-[#6b6b6b]">
              Descricao
            </label>
            <textarea
              id="descricao"
              name="descricao"
              rows={4}
              placeholder="Conte um pouco sobre a sua loja."
              value={lojaForm.descricao}
              onChange={handleLojaInputChange}
              className="w-full rounded-xl border border-[#6B6B6B] bg-black p-3 text-white placeholder-[#6b6b6b] outline-none transition focus:border-yellow-400"
            />
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-neutral-200">
            <input
              type="checkbox"
              checked={lojaForm.ativa}
              onChange={handleLojaAtivaChange}
              className="h-4 w-4 cursor-pointer accent-yellow-500"
            />
            Loja ativa para receber publicacoes e vendas
          </label>

          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-100">
            O cadastro usa o endereco e o telefone principal do seu perfil atual.
          </div>

          {lojaErroAcao ? <p className="text-sm text-red-400">{lojaErroAcao}</p> : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Botao
              type="button"
              variant="secondary"
              onClick={fecharModal}
              className="h-11 sm:w-auto sm:px-6"
            >
              Cancelar
            </Botao>

            <Botao
              type="submit"
              disabled={isSalvandoLoja}
              className="h-11 sm:w-auto sm:px-6"
            >
              {isSalvandoLoja
                ? "Salvando..."
                : temLoja
                  ? "Salvar loja"
                  : "Criar loja"}
            </Botao>
          </div>
        </form>
      </ProfileModal>
    </PageLayout>
  );
}
