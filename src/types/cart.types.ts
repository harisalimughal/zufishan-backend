// src/types/cart.types.ts
// Cart Types – DTOs and response shapes for the buyer's shopping cart.

export interface AddToCartDto {
  buyerId: string;
  productId: string;
  quantity: number;
}

export interface CartItemResponse {
  id: string;
  buyerId: string;
  productId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartResponse {
  items: CartItemResponse[];
  totalQuantity: number;
  totalAmount: number;
}
