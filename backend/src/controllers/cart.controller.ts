import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CartService } from '../services/cart.service';
import { AppError } from '../middleware/errorHandler';

const addItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Quantity must be greater than zero').default(1),
});

const updateItemSchema = z.object({
  quantity: z.number().int().min(0, 'Quantity cannot be negative'),
});

export const getCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required to access cart.', 401, 'UNAUTHORIZED');
    }

    const cart = await CartService.getCart(req.user.id);

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (err) {
    next(err);
  }
};

export const addItemToCart = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required to add items to cart.', 401, 'UNAUTHORIZED');
    }

    const { productId, quantity } = addItemSchema.parse(req.body);
    const cart = await CartService.addItem(req.user.id, productId, quantity);

    res.status(200).json({
      success: true,
      message: 'Item added to cart.',
      data: cart,
    });
  } catch (err) {
    next(err);
  }
};

export const updateCartItem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required to update cart.', 401, 'UNAUTHORIZED');
    }

    const { productId } = req.params;
    const { quantity } = updateItemSchema.parse(req.body);

    const cart = await CartService.updateItem(req.user.id, productId, quantity);

    res.status(200).json({
      success: true,
      message: 'Cart item updated.',
      data: cart,
    });
  } catch (err) {
    next(err);
  }
};

export const removeCartItem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required to modify cart.', 401, 'UNAUTHORIZED');
    }

    const { productId } = req.params;
    const cart = await CartService.removeItem(req.user.id, productId);

    res.status(200).json({
      success: true,
      message: 'Item removed from cart.',
      data: cart,
    });
  } catch (err) {
    next(err);
  }
};

export const clearCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required to clear cart.', 401, 'UNAUTHORIZED');
    }

    await CartService.clearCart(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully.',
      data: { items: [], totalItems: 0, subtotal: 0 },
    });
  } catch (err) {
    next(err);
  }
};
