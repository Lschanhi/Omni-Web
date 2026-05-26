import { apiRequest } from "../http/apiClient";

export type LojaPublicaResumo = {
  id?: number;
  nomeFantasia?: string | null;
  avatarUrl?: string | null;
  logoUrl?: string | null;
};

const lojaPublicaCache = new Map<number, Promise<LojaPublicaResumo | null>>();

function normalizarLojaPublica(response: unknown): LojaPublicaResumo | null {
  if (!response || typeof response !== "object") {
    return null;
  }

  const loja = response as Partial<LojaPublicaResumo>;

  return {
    id: typeof loja.id === "number" ? loja.id : undefined,
    nomeFantasia: typeof loja.nomeFantasia === "string" ? loja.nomeFantasia : null,
    avatarUrl: typeof loja.avatarUrl === "string" ? loja.avatarUrl : null,
    logoUrl: typeof loja.logoUrl === "string" ? loja.logoUrl : null,
  };
}

export async function obterLojaPublica(lojaId?: number | null) {
  if (!lojaId || !Number.isFinite(lojaId) || lojaId <= 0) {
    return null;
  }

  const cacheHit = lojaPublicaCache.get(lojaId);

  if (cacheHit) {
    return cacheHit;
  }

  const request = apiRequest<LojaPublicaResumo>(`/api/lojas/${lojaId}`)
    .then(normalizarLojaPublica)
    .catch(() => null);

  lojaPublicaCache.set(lojaId, request);
  return request;
}
