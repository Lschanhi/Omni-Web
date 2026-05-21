// Representa as abas disponiveis dentro da pagina de perfil.
export type PerfilTabId = "produtos" | "vendas" | "compras";

export interface UsuarioTelefonePerfil {
  id: number;
  numero: string;
  isPrincipal: boolean;
}

export interface UsuarioEnderecoPerfil {
  id: number;
  tipoLogradouro: string;
  tipoLogradouroDescricao?: string;
  nomeEndereco: string;
  numero: string;
  complemento?: string;
  cep: string;
  cidade: string;
  uf: string;
  isPrincipal: boolean;
  ativo: boolean;
}

// Define os dados basicos do usuario exibidos no topo da pagina.
export interface UsuarioPerfil {
  id: number;
  nome: string;
  primeiroNome: string;
  sobrenome: string;
  email: string;
  telefone: string;
  telefones: UsuarioTelefonePerfil[];
  telefonePrincipalId?: number;
  endereco: string;
  enderecos: UsuarioEnderecoPerfil[];
  enderecoPrincipalId?: number;
  avatarUrl?: string;
  resumo?: string;
  contaVerificada?: boolean;
}

// Define os indicadores principais exibidos no painel de estatisticas.
export interface UsuarioStatsData {
  avaliacaoMedia: number;
  seguidores: number;
  totalProdutos: number;
  totalVendas: number;
  totalCompras: number;
}

// Representa um item exibido no grid das abas de conteudo.
export interface PerfilGridItem {
  id: string;
  titulo: string;
  subtitulo: string;
  valor: string;
  imagemUrl?: string;
  badge?: string;
}

// Estrutura dos dados de cada aba do perfil.
export interface PerfilTabContent {
  titulo: string;
  descricao: string;
  vazioTitulo: string;
  vazioDescricao: string;
  itens: PerfilGridItem[];
}

// Define os estados de carregamento e erro usados na pagina.
export interface PerfilPageState {
  isUsuarioLoading: boolean;
  isConteudoLoading: boolean;
  usuarioError: string;
  conteudoError: string;
}
