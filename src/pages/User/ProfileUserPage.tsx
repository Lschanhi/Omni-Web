import { useEffect, type ChangeEvent, type FormEvent } from "react";
import {
  Plus,
  Store,
  Truck,
  User,
} from "lucide-react";
import { Spotlight } from "../../Components/home/SpotLight";
import { PageLayout } from "../../Components/PageLayout";
import { ProductGrid } from "../../Components/perfil/ProductGrid";
import { ProfileFeedback } from "../../Components/perfil/ProfileFeedback";
import { ProfileSection } from "../../Components/perfil/ProfileSection";
import { ProfileSkeleton } from "../../Components/perfil/ProfileSkeleton";
import { UserCard } from "../../Components/perfil/UserCard";
import { UserStats } from "../../Components/perfil/UserStats";
import { UserTabs } from "../../Components/perfil/UserTabs";
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
} from "../../Services/user/enderecoService";
import {
  criarMinhaLoja,
  atualizarMinhaLoja,
  type TipoDocumentoFiscalLoja,
} from "../../Services/user/lojaService";
import {
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
  PerfilTabContent,
  PerfilTabId,
  PerfilVisaoId,
} from "../../types/perfil";
import { ModalAvatarPerfil } from "./perfilUsuario/ModalAvatarPerfil";
import { ModalEntregasLoja } from "./perfilUsuario/ModalEntregasLoja";
import { ModalLojaPerfil } from "./perfilUsuario/ModalLojaPerfil";
import { ModalPerfilUsuario } from "./perfilUsuario/ModalPerfilUsuario";
import { ModalProdutoLoja } from "./perfilUsuario/ModalProdutoLoja";
import { SecaoProdutosLoja } from "./perfilUsuario/SecaoProdutosLoja";
import type { CategoriaLojaOption, PerfilEnderecoFormState } from "./perfilUsuario/tipos";
import { useEstadoLocalPerfilUsuario } from "./perfilUsuario/useEstadoLocalPerfilUsuario";
import {
  ABAS_DE_CONTEUDO_POR_VISAO,
  ABAS_DE_VISAO,
  ENDERECO_FORM_INICIAL,
  LOJA_ENTREGA_FORM_INICIAL,
  MAX_AVATAR_FILE_SIZE,
  MAX_PRODUCT_IMAGE_FILE_SIZE,
  METADADOS_ABAS,
  TELEFONE_FORM_INICIAL,
  criarCardComprador,
  criarCardLoja,
  criarCategoriasDaLoja,
  criarEntregaLojaForm,
  criarMensagemSucessoExclusaoCategoria,
  criarProdutoForm,
  criarStatsComprador,
  criarStatsLoja,
  deduplicarTelefonesParaFormulario,
  enderecoTemConteudo,
  encontrarTelefoneDuplicado,
  lerArquivoComoDataUrl,
  mapearEnderecoParaFormulario,
  mapearTelefoneParaFormulario,
  normalizarCep,
  normalizarFreteParaApi,
  normalizarPrazoEntregaParaApi,
  normalizarPrecoParaApi,
  normalizarPrincipalEnderecos,
  normalizarPrincipalTelefones,
  normalizarValorEnderecoFormulario,
  obterErroEnderecoInvalido,
  obterMensagemErroLoja,
  obterTipoEntregaLabel,
  ordenarEntregasLoja,
  resolverAvatarLoja,
  telefoneTemConteudo,
} from "./perfilUsuario/utilitarios";

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
  const {
    avatarDestino,
    avatarErroAcao,
    avatarLojaUrl,
    avatarNomeArquivo,
    avatarPreview,
    categoriaLojaAtiva,
    categoriaLojaModoExclusao,
    categoriaLojaPendenteExclusao,
    categoriaLojaRemovendoId,
    enderecosForm,
    enderecosRemovidos,
    entregaErroAcao,
    entregaLojaForm,
    entregaRemovendoId,
    entregasLoja,
    fecharModalLocal,
    isCarregandoEntregas,
    isRemovendoProduto,
    isSalvandoAvatar,
    isSalvandoEntrega,
    isSalvandoLoja,
    isSalvandoPerfil,
    isSalvandoProduto,
    lojaErroAcao,
    lojaFeedback,
    lojaForm,
    modalAberto,
    novoEnderecoForm,
    novoTelefoneForm,
    perfilErroAcao,
    perfilForm,
    produtoConfirmandoExclusao,
    produtoErroAcao,
    produtoForm,
    produtoImagemArquivo,
    setAvatarDestino,
    setAvatarErroAcao,
    setAvatarLojaUrl,
    setAvatarNomeArquivo,
    setAvatarPreview,
    setCategoriaLojaAtiva,
    setCategoriaLojaModoExclusao,
    setCategoriaLojaPendenteExclusao,
    setCategoriaLojaRemovendoId,
    setEnderecosForm,
    setEnderecosRemovidos,
    setEntregaErroAcao,
    setEntregaLojaForm,
    setEntregaRemovendoId,
    setEntregasLoja,
    setIsCarregandoEntregas,
    setIsRemovendoProduto,
    setIsSalvandoAvatar,
    setIsSalvandoEntrega,
    setIsSalvandoLoja,
    setIsSalvandoPerfil,
    setIsSalvandoProduto,
    setLojaErroAcao,
    setLojaFeedback,
    setLojaForm,
    setModalAberto,
    setNovoEnderecoForm,
    setNovoTelefoneForm,
    setPerfilErroAcao,
    setPerfilForm,
    setProdutoConfirmandoExclusao,
    setProdutoErroAcao,
    setProdutoForm,
    setProdutoImagemArquivo,
    setTelefonesForm,
    setTelefonesRemovidos,
    setTiposLogradouro,
    setVisaoAtiva,
    telefonesForm,
    telefonesRemovidos,
    tiposLogradouro,
    visaoAtiva,
  } = useEstadoLocalPerfilUsuario();

  const podeGerenciarLoja = Boolean(usuario?.enderecoPrincipalId && usuario?.telefonePrincipalId);
  const produtosDaLoja = tabItems.produtos;
  const categoriasDaLoja = criarCategoriasDaLoja(produtosDaLoja);
  const visoesDisponiveis = temLoja
    ? ABAS_DE_VISAO
    : ABAS_DE_VISAO.filter((visao) => visao.id !== "loja");
  const abasDisponiveis = ABAS_DE_CONTEUDO_POR_VISAO[visaoAtiva];
  const abaAtivaResolvida = abasDisponiveis.some((aba) => aba.id === abaAtiva)
    ? (abaAtiva as PerfilTabId)
    : (abasDisponiveis[0]?.id as PerfilTabId);
  const isStoreProductsTab = visaoAtiva === "loja" && abaAtivaResolvida === "produtos";
  const tabContent: PerfilTabContent = {
    ...METADADOS_ABAS[abaAtivaResolvida],
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
    fecharModalLocal();
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

  function handleCancelarModoExclusaoCategorias() {
    setCategoriaLojaModoExclusao(false);
    setCategoriaLojaPendenteExclusao(null);
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
                        <button
                          type="button"
                          onClick={() => abrirModalProduto()}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-yellow-400/30 bg-yellow-400/10 text-yellow-300 transition hover:border-yellow-400/50 hover:bg-yellow-400/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60"
                          aria-label="Adicionar produto"
                          title="Adicionar produto"
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      ) : null}
                    </div>

                    {isStoreProductsTab ? (
                      <SecaoProdutosLoja
                        categoriaLojaAtiva={categoriaLojaAtiva}
                        categoriaLojaModoExclusao={categoriaLojaModoExclusao}
                        categoriaLojaPendenteExclusao={categoriaLojaPendenteExclusao}
                        categoriaLojaRemovendoId={categoriaLojaRemovendoId}
                        categoriasDaLoja={categoriasDaLoja}
                        lojaFeedback={lojaFeedback}
                        onAlternarModoExclusaoCategorias={handleAlternarModoExclusaoCategorias}
                        onCancelarModoExclusaoCategorias={handleCancelarModoExclusaoCategorias}
                        onConfirmarRemocaoCategoria={() => void handleRemoverCategoriaLoja()}
                        onLimparCategoriaPendenteExclusao={() =>
                          setCategoriaLojaPendenteExclusao(null)
                        }
                        onSelecionarCategoria={setCategoriaLojaAtiva}
                        onSolicitarRemocaoCategoriaLoja={handleSolicitarRemocaoCategoriaLoja}
                      />
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

      <ModalAvatarPerfil
        altPreviewAvatar={altPreviewAvatar}
        avatarErroAcao={avatarErroAcao}
        avatarPreview={avatarPreview}
        descricao={descricaoModalAvatar}
        editandoFotoLoja={editandoFotoLoja}
        isOpen={modalAberto === "avatar"}
        isSalvandoAvatar={isSalvandoAvatar}
        labelRemoverAvatar={labelRemoverAvatar}
        labelSalvarAvatar={labelSalvarAvatar}
        onClose={fecharModal}
        onRemoverAvatar={handleRemoverAvatar}
        onSalvarAvatar={handleSalvarAvatar}
        onSelecionarAvatar={handleAvatarSelecionado}
        titulo={tituloModalAvatar}
      />

      <ModalPerfilUsuario
        enderecosForm={enderecosForm}
        isOpen={modalAberto === "perfil"}
        isSalvandoPerfil={isSalvandoPerfil}
        novoEnderecoForm={novoEnderecoForm}
        novoTelefoneForm={novoTelefoneForm}
        onAdicionarEndereco={handleAdicionarEndereco}
        onAdicionarTelefone={handleAdicionarTelefone}
        onChangeEnderecoExistente={handleEnderecoExistenteChange}
        onChangeNovoEndereco={handleNovoEnderecoChange}
        onChangeNovoTelefone={handleNovoTelefoneChange}
        onChangePerfilInput={handlePerfilInputChange}
        onChangeTelefoneExistente={handleTelefoneExistenteChange}
        onClose={fecharModal}
        onRemoverEndereco={handleRemoverEndereco}
        onRemoverNovoEndereco={handleRemoverNovoEndereco}
        onRemoverNovoTelefone={handleRemoverNovoTelefone}
        onRemoverTelefone={handleRemoverTelefone}
        onSubmit={handleSalvarPerfil}
        onToggleEnderecoPrincipal={handleEnderecoPrincipalChange}
        onToggleNovoEnderecoPrincipal={handleNovoEnderecoPrincipalChange}
        onToggleNovoTelefonePrincipal={handleNovoTelefonePrincipalChange}
        onToggleTelefonePrincipal={handleTelefonePrincipalChange}
        perfilErroAcao={perfilErroAcao}
        perfilForm={perfilForm}
        telefonesForm={telefonesForm}
        tiposLogradouro={tiposLogradouro}
      />

      <ModalEntregasLoja
        descricao={descricaoModalEntregas}
        entregaEmEdicao={entregaEmEdicao}
        entregaErroAcao={entregaErroAcao}
        entregaLojaForm={entregaLojaForm}
        entregaRemovendoId={entregaRemovendoId}
        entregasLoja={entregasLoja}
        handleCancelarEntrega={handleCancelarEntrega}
        handleEditarEntrega={handleEditarEntrega}
        handleNovaEntrega={handleNovaEntrega}
        handleRemoverEntregaLoja={(opcao) => {
          void handleRemoverEntregaLoja(opcao);
        }}
        isCarregandoEntregas={isCarregandoEntregas}
        isOpen={modalAberto === "entregas"}
        isSalvandoEntrega={isSalvandoEntrega}
        onChangeEntregaInput={handleEntregaInputChange}
        onClose={fecharModal}
        onSubmit={handleSalvarEntregaLoja}
        onToggleEntregaAtiva={handleEntregaAtivaChange}
        tipoEntregaAtualEhRetirada={tipoEntregaAtualEhRetirada}
        titulo={tituloModalEntregas}
      />

      <ModalProdutoLoja
        descricao={descricaoModalProduto}
        isOpen={modalAberto === "produto"}
        isProcessandoProduto={isProcessandoProduto}
        isRemovendoProduto={isRemovendoProduto}
        isSalvandoProduto={isSalvandoProduto}
        onChangeProdutoInput={handleProdutoInputChange}
        onClose={fecharModal}
        onConfirmarRemocaoProdutoAtual={() => void handleRemoverProdutoAtual()}
        onRemoverImagemProduto={handleRemoverImagemProduto}
        onSelecionarImagemProduto={handleProdutoImagemSelecionada}
        onSolicitarRemocaoProdutoAtual={handleSolicitarRemocaoProdutoAtual}
        onSubmit={handleSalvarProduto}
        onToggleProdutoDisponivel={handleProdutoDisponivelChange}
        produtoConfirmandoExclusao={produtoConfirmandoExclusao}
        produtoErroAcao={produtoErroAcao}
        produtoForm={produtoForm}
        titulo={tituloModalProduto}
        voltarConfirmacaoExclusao={() => setProdutoConfirmandoExclusao(false)}
      />

      <ModalLojaPerfil
        descricao="Use seus dados principais de endereco e telefone para liberar a loja rapidamente."
        isOpen={modalAberto === "loja"}
        isSalvandoLoja={isSalvandoLoja}
        lojaErroAcao={lojaErroAcao}
        lojaForm={lojaForm}
        onChangeLojaInput={handleLojaInputChange}
        onClose={fecharModal}
        onSubmit={handleSalvarLoja}
        onToggleLojaAtiva={handleLojaAtivaChange}
        temLoja={temLoja}
        titulo={temLoja ? "Editar loja" : "Criar loja"}
      />
    </PageLayout>
  );
}
