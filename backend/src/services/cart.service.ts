import { prisma } from '../config/db';
import { RedisService } from './redis.service';
import { AppError } from '../middleware/errorHandler';
import { ProductStatus } from '@prisma/client';

export interface CartItemStored {
  productId: string;
  quantity: number;
  updatedAt: string;
}

export interface EnrichedCartItem {
  productId: string;
  quantity: number;
  name: string;
  slug: string;
  price: number;
  stock: number;
  image: string | null;
  vendor: {
    id: string;
    storeName: string;
    storeSlug: string;
  };
  itemSubtotal: number;
}

export interface EnrichedCart {
  items: EnrichedCartItem[];
  totalItems: number;
  subtotal: number;
}

// In-memory fallback if Redis is unreachable
const inMemoryCartStore: Map<string, CartItemStored[]> = new Map();

export class CartService {
  private static CART_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

  private static getCartKey(userId: string): string {
    return `cart:${userId}`;
  }

  /**
   * Fetch raw stored items for a user
   */
  static async getRawCart(userId: string): Promise<CartItemStored[]> {
    const key = this.getCartKey(userId);
    const cached = await RedisService.getCache<CartItemStored[]>(key);
    if (cached && Array.isArray(cached)) {
      return cached;
    }
    return inMemoryCartStore.get(key) || [];
  }

  /**
   * Save raw cart items
   */
  static async saveRawCart(userId: string, items: CartItemStored[]): Promise<void> {
    const key = this.getCartKey(userId);
    inMemoryCartStore.set(key, items);
    await RedisService.setCache(key, items, this.CART_TTL_SECONDS);
  }

  /**
   * Clear user cart
   */
  static async clearCart(userId: string): Promise<void> {
    const key = this.getCartKey(userId);
    inMemoryCartStore.delete(key);
    await RedisService.deleteCache(key);
  }

  /**
   * Retrieve cart enriched with real-time PostgreSQL product details, prices, and stock
   */
  static async getCart(userId: string): Promise<EnrichedCart> {
    const rawItems = await this.getRawCart(userId);
    if (rawItems.length === 0) {
      return { items: [], totalItems: 0, subtotal: 0 };
    }

    const productIds = rawItems.map((i) => i.productId);

    // Fetch live product details from PostgreSQL
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        status: ProductStatus.PUBLISHED, // Exclude unpublished or removed products
      },
      include: {
        vendor: {
          select: { id: true, storeName: true, storeSlug: true },
        },
        images: {
          orderBy: { position: 'asc' },
          take: 1,
        },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const enrichedItems: EnrichedCartItem[] = [];
    let updatedRawItems: CartItemStored[] = [];
    let cartModified = false;

    for (const raw of rawItems) {
      const product = productMap.get(raw.productId);
      if (!product) {
        // Product no longer published or available -> drop from cart
        cartModified = true;
        continue;
      }

      // Clamp quantity to available stock
      let quantity = raw.quantity;
      if (quantity > product.stock) {
        quantity = Math.max(1, product.stock);
        cartModified = true;
      }

      const priceNum = Number(product.price);
      const itemSubtotal = parseFloat((priceNum * quantity).toFixed(2));

      enrichedItems.push({
        productId: product.id,
        quantity,
        name: product.name,
        slug: product.slug,
        price: priceNum,
        stock: product.stock,
        image: product.images[0]?.publicUrl || null,
        vendor: product.vendor,
        itemSubtotal,
      });

      updatedRawItems.push({
        productId: raw.productId,
        quantity,
        updatedAt: raw.updatedAt,
      });
    }

    if (cartModified) {
      await this.saveRawCart(userId, updatedRawItems);
    }

    const totalItems = enrichedItems.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = parseFloat(
      enrichedItems.reduce((sum, item) => sum + item.itemSubtotal, 0).toFixed(2)
    );

    return {
      items: enrichedItems,
      totalItems,
      subtotal,
    };
  }

  /**
   * Add product to cart or increment quantity
   */
  static async addItem(userId: string, productId: string, quantity: number): Promise<EnrichedCart> {
    if (quantity <= 0) {
      throw new AppError('Quantity must be greater than zero.', 400, 'VALIDATION_ERROR');
    }

    // Verify product in PostgreSQL
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.status !== ProductStatus.PUBLISHED) {
      throw new AppError('Product not found or unavailable for purchase.', 404, 'PRODUCT_UNAVAILABLE');
    }

    const rawItems = await this.getRawCart(userId);
    const existingIndex = rawItems.findIndex((i) => i.productId === productId);

    let targetQuantity = quantity;
    if (existingIndex > -1) {
      targetQuantity = rawItems[existingIndex].quantity + quantity;
    }

    // ACCEPTANCE CRITERIA: Cart quantity cannot exceed stock
    if (targetQuantity > product.stock) {
      throw new AppError(
        `Cannot add ${quantity} item(s). Current available stock is ${product.stock}.`,
        400,
        'STOCK_LIMIT_EXCEEDED'
      );
    }

    if (existingIndex > -1) {
      rawItems[existingIndex].quantity = targetQuantity;
      rawItems[existingIndex].updatedAt = new Date().toISOString();
    } else {
      rawItems.push({
        productId,
        quantity: targetQuantity,
        updatedAt: new Date().toISOString(),
      });
    }

    await this.saveRawCart(userId, rawItems);
    return this.getCart(userId);
  }

  /**
   * Update item quantity directly
   */
  static async updateItem(userId: string, productId: string, quantity: number): Promise<EnrichedCart> {
    if (quantity <= 0) {
      return this.removeItem(userId, productId);
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.status !== ProductStatus.PUBLISHED) {
      throw new AppError('Product not found or unavailable.', 404, 'PRODUCT_UNAVAILABLE');
    }

    // ACCEPTANCE CRITERIA: Cart quantity cannot exceed stock
    if (quantity > product.stock) {
      throw new AppError(
        `Cannot set quantity to ${quantity}. Current stock is ${product.stock}.`,
        400,
        'STOCK_LIMIT_EXCEEDED'
      );
    }

    const rawItems = await this.getRawCart(userId);
    const existingIndex = rawItems.findIndex((i) => i.productId === productId);

    if (existingIndex > -1) {
      rawItems[existingIndex].quantity = quantity;
      rawItems[existingIndex].updatedAt = new Date().toISOString();
      await this.saveRawCart(userId, rawItems);
    } else {
      await this.addItem(userId, productId, quantity);
    }

    return this.getCart(userId);
  }

  /**
   * Remove item from cart
   */
  static async removeItem(userId: string, productId: string): Promise<EnrichedCart> {
    const rawItems = await this.getRawCart(userId);
    const filtered = rawItems.filter((i) => i.productId !== productId);
    await this.saveRawCart(userId, filtered);
    return this.getCart(userId);
  }
}
