import type { HomeProduct } from "../../types/home";
import { apiRequest } from "../http/apiClient";

type ProdutoApiResponse = {
  id: number;
  nome: string;
  categoria: string;
  sku: string;
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
  imagens: string[];
};

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

function mapearProduto(produto: ProdutoApiResponse): HomeProduct {
  const imagens = produto.imagens.filter(Boolean);
  const imagemPrincipal = imagens[0] ?? criarImagemPlaceholder(produto.nome);

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
  return produtos.map(mapearProduto);
}

export async function obterProdutoPorId(id: number) {
  const produto = await apiRequest<ProdutoApiResponse>(`/api/produto/${id}`);
  return mapearProduto(produto);
}
