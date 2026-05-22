import type { HomeProduct } from "../../types/home";
import { API_BASE_URL, apiRequest } from "../http/apiClient";
import { getStoredProdutoImage } from "./produtoImageStorage";

type ProdutoApiResponse = {
  id: number;
  nome: string;
  categoria: string;
  sku?: string;
  preco: number;
  estoque: number;
  disponivel: boolean;
  statusPublicacao: string;
  descricao?: string | null;
  mediaAvaliacao: number;
  totalAvaliacoes: number;
  lojaId: number;
  nomeLoja: string;
  slugLoja: string;
  imagens?: string[] | null;
};

type ProdutoMutacaoApiResponse =
  | ProdutoApiResponse
  | {
      mensagem?: string;
      produto?: ProdutoApiResponse | null;
      data?: ProdutoApiResponse | null;
    }
  | null
  | undefined;

export type ProdutoMutacaoPayload = {
  nome: string;
  categoria: string;
  preco: number;
  estoque: number;
  disponivel: boolean;
  descricao?: string;
  imagens?: string[];
};

type ProdutoMidiaApiItem =
  | string
  | {
      id?: number;
      url?: string | null;
      Url?: string | null;
      arquivoUrl?: string | null;
      ArquivoUrl?: string | null;
      midiaUrl?: string | null;
      MidiaUrl?: string | null;
      blobUrl?: string | null;
      BlobUrl?: string | null;
      caminho?: string | null;
      Caminho?: string | null;
      src?: string | null;
      Src?: string | null;
      arquivo?: {
        url?: string | null;
      } | null;
    };

type ProdutoMidiaApiResponse =
  | ProdutoMidiaApiItem[]
  | {
      midias?: ProdutoMidiaApiItem[] | null;
      Midias?: ProdutoMidiaApiItem[] | null;
      data?: ProdutoMidiaApiItem[] | null;
      itens?: ProdutoMidiaApiItem[] | null;
    }
  | null
  | undefined;

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function criarCategoriaId(categoria: string) {
  return normalizarTexto(categoria)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "geral";
}

function criarImagemPlaceholder(label: string) {
  const titulo = label.trim().slice(0, 22) || "OmniMarket";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#111827" />
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#bg)" />
      <circle cx="650" cy="140" r="110" fill="rgba(255,255,255,0.08)" />
      <circle cx="180" cy="470" r="150" fill="rgba(0,0,0,0.18)" />
      <text x="60" y="315" fill="#ffffff" font-family="Arial, sans-serif" font-size="46" font-weight="700">
        ${titulo}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function isProdutoApiResponse(value: unknown): value is ProdutoApiResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const produto = value as Partial<ProdutoApiResponse>;

  return (
    typeof produto.id === "number" &&
    typeof produto.nome === "string" &&
    typeof produto.categoria === "string"
  );
}

function extrairProdutoDaResposta(response: ProdutoMutacaoApiResponse) {
  if (isProdutoApiResponse(response)) {
    return response;
  }

  if (!response || typeof response !== "object") {
    return null;
  }

  if (isProdutoApiResponse(response.produto)) {
    return response.produto;
  }

  if (isProdutoApiResponse(response.data)) {
    return response.data;
  }

  return null;
}

function extrairUrlMidia(midia: ProdutoMidiaApiItem) {
  if (typeof midia === "string") {
    return resolverUrlImagemProduto(midia);
  }

  if (!midia || typeof midia !== "object") {
    return "";
  }

  const candidatos = [
    midia.url,
    midia.Url,
    midia.arquivoUrl,
    midia.ArquivoUrl,
    midia.midiaUrl,
    midia.MidiaUrl,
    midia.blobUrl,
    midia.BlobUrl,
    midia.caminho,
    midia.Caminho,
    midia.src,
    midia.Src,
    midia.arquivo?.url,
  ];

  const url =
    candidatos.find((valor) => typeof valor === "string" && valor.trim())?.trim() ?? "";

  return resolverUrlImagemProduto(url);
}

function resolverUrlImagemProduto(url: string | null | undefined) {
  const valor = url?.trim() ?? "";

  if (!valor) {
    return "";
  }

  if (/^(?:https?:|data:|blob:)/i.test(valor)) {
    return valor;
  }

  const caminhoNormalizado = valor.startsWith("/") ? valor : `/${valor}`;
  return `${API_BASE_URL}${caminhoNormalizado}`;
}

function normalizarImagensProduto(imagens: Array<string | null | undefined> | null | undefined) {
  return Array.isArray(imagens)
    ? imagens.map((imagem) => resolverUrlImagemProduto(imagem)).filter(Boolean)
    : [];
}

function normalizarMidias(response: ProdutoMidiaApiResponse) {
  const itens = Array.isArray(response)
    ? response
    : response?.midias ?? response?.Midias ?? response?.data ?? response?.itens ?? [];

  return itens.map(extrairUrlMidia).filter(Boolean);
}

export async function listarMidiasProduto(produtoId: number) {
  const response = await apiRequest<ProdutoMidiaApiResponse>(`/api/produtos/${produtoId}/midias`);
  return normalizarMidias(response);
}

export async function enviarMidiasProduto(produtoId: number, arquivos: File[]) {
  const formData = new FormData();

  arquivos.forEach((arquivo) => {
    formData.append("arquivos", arquivo);
  });

  const response = await apiRequest<ProdutoMidiaApiResponse>(`/api/produtos/${produtoId}/midias`, {
    method: "POST",
    authenticated: true,
    body: formData,
  });

  return normalizarMidias(response);
}

function mapearProduto(produto: ProdutoApiResponse): HomeProduct {
  const imagens = normalizarImagensProduto(produto.imagens);
  const imagemSalvaLocalmente = getStoredProdutoImage(produto.id);
  const imagemPrincipal =
    imagens[0] ?? imagemSalvaLocalmente ?? criarImagemPlaceholder(produto.nome);

  return {
    id: produto.id,
    nome: produto.nome,
    preco: Number(produto.preco),
    avaliacao: Number(produto.mediaAvaliacao ?? 0),
    categoriaId: criarCategoriaId(produto.categoria),
    categoriaNome: produto.categoria,
    imagem: imagemPrincipal,
    imagens: imagens.length > 0 ? imagens : [imagemPrincipal],
    destaque:
      produto.totalAvaliacoes > 0
        ? `${produto.totalAvaliacoes} avaliacoes`
        : produto.nomeLoja,
    descricao: produto.descricao ?? "",
    sku: produto.sku,
    estoque: produto.estoque,
    disponivel: produto.disponivel,
    lojaId: produto.lojaId,
    lojaNome: produto.nomeLoja,
    slugLoja: produto.slugLoja,
    totalAvaliacoes: produto.totalAvaliacoes,
  };
}

export async function listarProdutos() {
  const produtos = await apiRequest<ProdutoApiResponse[]>("/api/produto");
  const produtosComMidia = await Promise.all(
    produtos.map(async (produto) => {
      const imagens = normalizarImagensProduto(produto.imagens);

      if (imagens.length > 0) {
        return {
          ...produto,
          imagens,
        };
      }

      const midias = await listarMidiasProduto(produto.id).catch(() => []);
      return {
        ...produto,
        imagens: midias,
      };
    }),
  );

  return produtosComMidia.map(mapearProduto);
}

export async function obterProdutoPorId(id: number) {
  const produto = await apiRequest<ProdutoApiResponse>(`/api/produto/${id}`);
  const imagens = normalizarImagensProduto(produto.imagens);
  const produtoComMidia =
    imagens.length > 0
      ? {
          ...produto,
          imagens,
        }
      : {
          ...produto,
          imagens: await listarMidiasProduto(id).catch(() => []),
        };

  return mapearProduto(produtoComMidia);
}

export async function criarProduto(payload: ProdutoMutacaoPayload) {
  const response = await apiRequest<ProdutoMutacaoApiResponse>("/api/produto", {
    method: "POST",
    authenticated: true,
    body: payload,
  });

  const produto = extrairProdutoDaResposta(response);
  return produto ? mapearProduto(produto) : null;
}

export async function atualizarProduto(id: number, payload: ProdutoMutacaoPayload) {
  const response = await apiRequest<ProdutoMutacaoApiResponse>(`/api/produto/${id}`, {
    method: "PUT",
    authenticated: true,
    body: payload,
  });

  const produto = extrairProdutoDaResposta(response);
  return produto ? mapearProduto(produto) : null;
}
