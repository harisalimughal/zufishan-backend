// src/types/checkout.types.ts
// Checkout Types – DTOs for creating and processing orders.

export interface CheckoutDto {
  buyerId: string;
  cartId?: string; // optional if cart items are passed directly
  paymentMethod: string;
  shippingAddress: string;
}
