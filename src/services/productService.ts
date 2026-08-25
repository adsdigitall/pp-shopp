import { Product, FilterType } from '../types/product';
import { MOCK_PRODUCTS } from '../mocks/productsData';

/**
 * Service to manage products.
 * Uses mock data clearly separated for future API integration.
 */
class ProductService {
  /**
   * Fetch list of products according to filter and search keyword.
   */
  async getProducts(filter: FilterType = 'trending', query: string = ''): Promise<Product[]> {
    // Simulate brief latency for realistic feel
    await new Promise((resolve) => setTimeout(resolve, 60));

    let list = [...MOCK_PRODUCTS];

    // Filter by search query (name or category)
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q)
      );
    }

    // Apply sorting/filtering rules
    switch (filter) {
      case 'trending':
        list.sort((a, b) => (b.isHot ? 1 : 0) - (a.isHot ? 1 : 0) || b.rating - a.rating);
        break;

      case 'top_sales':
        list.sort((a, b) => b.salesCount - a.salesCount);
        break;

      case 'high_commission':
        list.sort((a, b) => b.privateCommission.estimatedValue - a.privateCommission.estimatedValue);
        break;

      case 'high_discount':
        list.sort((a, b) => b.discountPercentage - a.discountPercentage);
        break;

      default:
        break;
    }

    return list;
  }

  /**
   * Fetch single product details by ID.
   */
  async getProductById(id: string): Promise<Product | undefined> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return MOCK_PRODUCTS.find((p) => p.id === id);
  }
}

export const productService = new ProductService();
