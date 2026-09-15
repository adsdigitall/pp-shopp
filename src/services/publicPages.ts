// Contrato de /api/pages (server/services/pages/publicPages.mjs + handlers em server/index.mjs).

export type PageType = 'vitrine' | 'convite' | 'linktree';
export type PageStatus = 'draft' | 'published';

export interface PageProduct {
  id: string | null;
  name: string;
  imageUrl: string | null;
  currentPrice: number | null;
  originalPrice: number | null;
  affiliateUrl: string;
  marketplace: string | null;
}

export interface PageGroup {
  name: string;
  description: string;
  inviteUrl: string;
}

export interface PageLink {
  title: string;
  url: string;
}

export interface PublicPageData {
  id: string;
  type: PageType;
  name: string;
  description: string;
  status: PageStatus;
  slug: string;
  coverImage: string | null;
  /** Capa efetiva: a escolhida ou a do primeiro produto da vitrine. */
  coverUrl: string | null;
  products: PageProduct[];
  groups: PageGroup[];
  links: PageLink[];
  stats: { visits: number; clicks: number; shares: number };
  publicPath: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export type PageInput = Partial<Pick<PublicPageData, 'type' | 'name' | 'description' | 'status' | 'slug' | 'coverImage' | 'products' | 'groups' | 'links'>>;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: 'no-store',
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `Erro ${response.status}`);
  return data as T;
}

export const pagesApi = {
  list: () => request<{ pages: PublicPageData[] }>('/api/pages').then((d) => d.pages),
  create: (input: PageInput) => request<{ page: PublicPageData }>('/api/pages', { method: 'POST', body: JSON.stringify(input) }).then((d) => d.page),
  update: (id: string, input: PageInput) => request<{ page: PublicPageData }>(`/api/pages/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(input) }).then((d) => d.page),
  duplicate: (id: string) => request<{ page: PublicPageData }>(`/api/pages/${encodeURIComponent(id)}/duplicate`, { method: 'POST' }).then((d) => d.page),
  remove: (id: string) => request<{ ok: true }>(`/api/pages/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export const publicPageUrl = (slug: string) => `${window.location.origin}/p/${slug}`;

export const PAGE_TYPE_INFO: Record<PageType, { tab: string; singular: string; newLabel: string; empty: string }> = {
  vitrine: { tab: 'Vitrine de Ofertas', singular: 'vitrine', newLabel: 'Nova vitrine', empty: 'Monte uma vitrine com as ofertas da sua fila e compartilhe um link só.' },
  convite: { tab: 'Convite para Grupos', singular: 'convite', newLabel: 'Novo convite', empty: 'Junte os links de convite dos seus grupos numa página pra divulgar.' },
  linktree: { tab: 'LinkTree Personalizada', singular: 'LinkTree', newLabel: 'Nova LinkTree', empty: 'Crie seu link na bio com tudo o que você quer mostrar.' },
};
