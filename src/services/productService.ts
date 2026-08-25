import { Product, FilterType } from '../types/product';

/**
 * Serviço de produtos conectado ao BACKEND REAL (/api/products).
 * Fluxo: Frontend -> nosso backend -> Shopee Affiliate API -> normalizado aqui.
 * Os mocks ficam isolados em src/mocks e não são mais usados nesta classe.
 */

const VALID_FILTERS: FilterType[] = [
  'trending',
  'top_sales',
  'high_commission',
  'high_discount',
];

export class ProductsApiError extends Error {
  /** Código estável do erro vindo do backend (ex.: MISSING_CREDENTIALS). */
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ProductsApiError';
    this.code = code;
  }
}

interface ApiProductDto {
  id?: string | number;
  title?: string;
  imageUrl?: string;
  currentPrice?: number | null;
  originalPrice?: number | null;
  discountPercentage?: number | null;
  commissionRate?: number | null;
  commissionAmount?: number | null;
  productUrl?: string | null;
  affiliateUrl?: string | null;
  rating?: number | null;
  soldCount?: number | null;
}

interface ApiEnvelope {
  products?: ApiProductDto[];
  meta?: Record<string, unknown>;
}

interface ApiErrorResponse {
  error?: { code?: string; message?: string };
}

/** Formata contagem de vendas sem inventar dados (apenas formatação local). */
function formatSoldCount(sold: number | null): string | null {
  if (sold === null) return null;
  if (sold >= 1000) {
    const thousands = Math.floor(sold / 100) / 10;
    return `${thousands.toLocaleString('pt-BR', {
      maximumFractionDigits: 1,
    })}k vendidos`;
  }
  return `${sold} vendidos`;
}

function mapDtoToProduct(dto: ApiProductDto): Product {
  return {
    id: dto.id !== undefined && dto.id !== null ? String(dto.id) : '',
    name: typeof dto.title === 'string' ? dto.title : '',
    imageUrl: typeof dto.imageUrl === 'string' ? dto.imageUrl : '',
    currentPrice: dto.currentPrice ?? null,
    originalPrice: dto.originalPrice ?? null,
    discountPercentage: dto.discountPercentage ?? null,
    salesCount: dto.soldCount ?? null,
    salesCountText: formatSoldCount(dto.soldCount ?? null),
    rating: dto.rating ?? null,
    reviewsCount: null,
    category: null,
    shopeeUrl: dto.productUrl ?? null,
    affiliateUrl: dto.affiliateUrl ?? null,
    // PRIVATE DATA — somente para o painel privado, nunca para compartilhamento
    privateCommission: {
      percentage: dto.commissionRate ?? null,
      estimatedValue: dto.commissionAmount ?? null,
    },
    shortDescription: null,
    highlightPoints: [],
  };
}

class ProductService {
  /**
   * Busca produtos reais via backend interno.
   * @throws ProductsApiError quando o backend ou a Shopee falharem.
   */
  async getProducts(
    filter: FilterType = 'trending',
    query: string = '',
    signal?: AbortSignal
  ): Promise<Product[]> {
    const activeFilter = VALID_FILTERS.includes(filter) ? filter : 'trending';

    const params = new URLSearchParams();
    params.set('sort', activeFilter);
    params.set('limit', '12');
    if (query.trim()) params.set('keyword', query.trim());

    let response: Response;
    try {
      response = await fetch(`/api/products?${params.toString()}`, { signal });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      throw new ProductsApiError(
        'NETWORK',
        'Não foi possível conectar ao servidor interno da aplicação.'
      );
    }

    const body = (await response.json().catch(() => null)) as
      | (ApiEnvelope & ApiErrorResponse)
      | null;

    if (!response.ok || !body || body.error) {
      throw new ProductsApiError(
        body?.error?.code || `HTTP_${response.status}`,
        body?.error?.message ||
          'Falha ao carregar produtos. Tente novamente em instantes.'
      );
    }

    const list: ApiProductDto[] = Array.isArray(body.products)
      ? body.products
      : [];
    return list.map(mapDtoToProduct);
  }

  /**
   * Busca um produto por ID (usa a mesma listagem real).
   */
  async getProductById(id: string): Promise<Product | undefined> {
    const list = await this.getProducts('trending', '', undefined);
    return list.find((p) => p.id === id);
  }
}

export const productService = new ProductService();
