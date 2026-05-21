import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { ImagePlus, LockIcon, Mail, MapPin, Minus, Phone, Plus, Store, Trash2, User } from "lucide-react";
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
import { UserTabs } from "../../Components/perfil/UserTabs";
import { usePerfilUsuarioData } from "../../hooks/usePerfilUsuarioData";
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
import type { UsuarioEnderecoPerfil, UsuarioTelefonePerfil } from "../../types/perfil";

type ModalAberto = "avatar" | "perfil" | "loja" | null;

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
  slug: string;
  tipoDocumentoFiscal: `${TipoDocumentoFiscalLoja}`;
  documentoFiscal: string;
  descricao: string;
  emailContato: string;
  ativa: boolean;
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
  slug: "",
  tipoDocumentoFiscal: "1",
  documentoFiscal: "",
  descricao: "",
  emailContato: "",
  ativa: true,
};

const MAX_AVATAR_FILE_SIZE = 2 * 1024 * 1024;

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

function enderecoEstaCompleto(endereco: PerfilEnderecoFormState) {
  return Boolean(
    endereco.tipoLogradouro.trim() &&
      endereco.nomeEndereco.trim() &&
      endereco.numero.trim() &&
      normalizarCep(endereco.cep).length === 8 &&
      endereco.cidade.trim() &&
      endereco.uf.trim().length === 2,
  );
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
    tabContent,
    isUsuarioLoading,
    isConteudoLoading,
    usuarioError,
    conteudoError,
    setAbaAtiva,
    recarregarDados,
  } = usePerfilUsuarioData();
  const [modalAberto, setModalAberto] = useState<ModalAberto>(null);
  const [perfilForm, setPerfilForm] = useState<PerfilFormState>(PERFIL_FORM_INICIAL);
  const [avatarPreview, setAvatarPreview] = useState("");
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
  const [tiposLogradouro, setTiposLogradouro] = useState<TipoLogradouroOption[]>(
    TIPOS_LOGRADOURO_FALLBACK,
  );
  const [perfilErroAcao, setPerfilErroAcao] = useState("");
  const [lojaErroAcao, setLojaErroAcao] = useState("");
  const [isSalvandoPerfil, setIsSalvandoPerfil] = useState(false);
  const [isSalvandoLoja, setIsSalvandoLoja] = useState(false);

  const podeGerenciarLoja = Boolean(usuario?.enderecoPrincipalId && usuario?.telefonePrincipalId);

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
    setAvatarPreview("");
    setAvatarNomeArquivo("");
    setAvatarErroAcao("");
    setPerfilErroAcao("");
    setLojaErroAcao("");
    setNovoTelefoneForm(null);
    setNovoEnderecoForm(null);
    setTelefonesRemovidos([]);
    setEnderecosRemovidos([]);
  }

  function abrirModalAvatar() {
    if (!usuario) {
      return;
    }

    setAvatarErroAcao("");
    setAvatarPreview(usuario.avatarUrl ?? "");
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
            slug: loja.slug,
            tipoDocumentoFiscal: String(loja.tipoDocumentoFiscal) as `${TipoDocumentoFiscalLoja}`,
            documentoFiscal: loja.documentoFiscalFormatado || loja.documentoFiscal,
            descricao: loja.descricao ?? "",
            emailContato: loja.emailContato ?? usuario.email,
            ativa: loja.ativa,
          }
        : {
            nomeFantasia: usuario.nome,
            slug: "",
            tipoDocumentoFiscal: "1",
            documentoFiscal: "",
            descricao: "",
            emailContato: usuario.email,
            ativa: true,
          },
    );
    setModalAberto("loja");
  }

  function handlePerfilInputChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setPerfilForm((currentData) => ({
      ...currentData,
      [name]: value,
    }));
    setPerfilErroAcao("");
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
        currentIndex === index ? { ...endereco, [field]: value } : endereco,
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
      [field]: value,
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
      setAvatarErroAcao("Escolha uma imagem de ate 2 MB para o perfil.");
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

      if (avatarPreview) {
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
      alert(avatarPreview ? "Foto do perfil atualizada com sucesso!" : "Foto do perfil removida com sucesso!");
    } catch (error) {
      setAvatarErroAcao(
        error instanceof Error ? error.message : "Nao foi possivel salvar a foto do perfil.",
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

      if (novoEnderecoForm && enderecoTemConteudo(novoEnderecoForm) && !enderecoEstaCompleto(novoEnderecoForm)) {
        throw new Error(
          "Preencha todos os campos obrigatorios do novo endereco antes de salvar.",
        );
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
          slug: loja.slug || undefined,
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
        slug: lojaForm.slug.trim() || undefined,
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
      setLojaErroAcao(error instanceof Error ? error.message : "Nao foi possivel salvar a loja.");
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
              <div className="space-y-3">
                <span className="inline-flex rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-1 text-sm font-medium text-yellow-300">
                  Central do perfil
                </span>
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Meu perfil
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-neutral-400 sm:text-base">
                  Pagina preparada para receber dados reais da API, com componentes reutilizaveis,
                  abas dinamicas e estados visuais de carregamento, vazio e erro.
                </p>
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
                  usuario={usuario}
                  onEditAvatar={abrirModalAvatar}
                  onEditProfile={abrirModalPerfil}
                  onStoreAction={abrirModalLoja}
                  storeActionLabel={temLoja ? "Editar loja" : "Criar loja"}
                  canManageStore={podeGerenciarLoja}
                />
              )}
            </div>

            <div className="space-y-6">
              {/* Exibe o resumo numerico da conta mesmo quando o usuario ainda nao possui dados completos. */}
              <UserStats stats={stats} />

              <ProfileSection title={tabContent.titulo} description={tabContent.descricao}>
                {/* Controla a troca de abas e o recarregamento dinamico do conteudo. */}
                <div className="space-y-5">
                  <UserTabs abaAtiva={abaAtiva} onChange={setAbaAtiva} />

                  {/* Renderiza feedback visual adequado para cada estado da listagem. */}
                  {isConteudoLoading ? (
                    <ProfileSkeleton />
                  ) : conteudoError ? (
                    <ProfileFeedback
                      variant="error"
                      title="Erro ao carregar conteudo"
                      description={conteudoError}
                    />
                  ) : tabContent.itens.length === 0 ? (
                    <ProfileFeedback
                      variant="empty"
                      title={tabContent.vazioTitulo}
                      description={tabContent.vazioDescricao}
                    />
                  ) : (
                    <ProductGrid itens={tabContent.itens} />
                  )}
                </div>
              </ProfileSection>
            </div>
          </div>
        </div>
      </div>

      <ProfileModal
        isOpen={modalAberto === "avatar"}
        title="Foto do perfil"
        description="Escolha uma imagem do seu computador para usar como foto do perfil neste navegador."
        onClose={fecharModal}
      >
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 text-center">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Preview da foto do perfil"
                className="h-32 w-32 rounded-full border-4 border-yellow-400 object-cover"
              />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-dashed border-yellow-400/40 bg-black text-sm font-medium text-neutral-400">
                Sem foto
              </div>
            )}

            <label className="w-full cursor-pointer rounded-2xl border border-dashed border-yellow-400/30 bg-yellow-400/10 px-4 py-5 text-sm text-yellow-100 transition hover:border-yellow-400/50 hover:bg-yellow-400/15">
              <div className="flex flex-col items-center gap-3">
                <ImagePlus className="h-6 w-6" />
                <div className="space-y-1">
                  <p className="font-medium text-white">Selecionar imagem</p>
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
                Remover foto
              </Botao>
            </div>

            <Botao
              type="button"
              disabled={isSalvandoAvatar}
              onClick={handleSalvarAvatar}
              className="h-11 sm:w-auto sm:px-6"
            >
              {isSalvandoAvatar ? "Salvando..." : "Salvar foto"}
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
                      placeholder="Flor de Ouro"
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
                      placeholder="249"
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
                      placeholder="Apto 12"
                      value={endereco.complemento}
                      onChange={(event) =>
                        handleEnderecoExistenteChange(index, "complemento", event.target.value)
                      }
                    />

                    <Input
                      label="CEP"
                      id={`cepEndereco-${index}`}
                      name={`cepEndereco-${index}`}
                      placeholder="01001000"
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
                      placeholder="Sao Paulo"
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
                      placeholder="SP"
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
                      placeholder="Flor de Ouro"
                      value={novoEnderecoForm.nomeEndereco}
                      onChange={(event) =>
                        handleNovoEnderecoChange("nomeEndereco", event.target.value)
                      }
                    />

                    <Input
                      label="Numero"
                      id="novoNumeroEndereco"
                      name="novoNumeroEndereco"
                      placeholder="249"
                      value={novoEnderecoForm.numero}
                      onChange={(event) =>
                        handleNovoEnderecoChange("numero", event.target.value)
                      }
                    />

                    <Input
                      label="Complemento"
                      id="novoComplementoEndereco"
                      name="novoComplementoEndereco"
                      placeholder="Apto 12"
                      value={novoEnderecoForm.complemento}
                      onChange={(event) =>
                        handleNovoEnderecoChange("complemento", event.target.value)
                      }
                    />

                    <Input
                      label="CEP"
                      id="novoCepEndereco"
                      name="novoCepEndereco"
                      placeholder="01001000"
                      value={novoEnderecoForm.cep}
                      onChange={(event) => handleNovoEnderecoChange("cep", event.target.value)}
                    />

                    <Input
                      label="Cidade"
                      id="novaCidadeEndereco"
                      name="novaCidadeEndereco"
                      placeholder="Sao Paulo"
                      value={novoEnderecoForm.cidade}
                      onChange={(event) =>
                        handleNovoEnderecoChange("cidade", event.target.value)
                      }
                    />

                    <Input
                      label="UF"
                      id="novaUfEndereco"
                      name="novaUfEndereco"
                      placeholder="SP"
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
        isOpen={modalAberto === "loja"}
        title={temLoja ? "Editar loja" : "Criar loja"}
        description="Use seus dados principais de endereco e telefone para liberar a loja rapidamente."
        onClose={fecharModal}
      >
        <form className="space-y-5" onSubmit={handleSalvarLoja}>
          <div className="grid gap-4 sm:grid-cols-2">
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

            <Input
              label="Slug (opcional)"
              id="slug"
              name="slug"
              placeholder="minha-loja"
              value={lojaForm.slug}
              onChange={handleLojaInputChange}
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
