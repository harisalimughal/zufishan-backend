// src/types/order.types.ts
// Order Types – defines DTOs and response shapes for marketplace orders.

export interface CreateOrderDto {
  buyerId: string;
  items: { productId: string; quantity: number }[];
  paymentMethod: string;
  shippingAddress: string;
}

export interface OrderResponse {
  id: string;
  buyerId: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}
