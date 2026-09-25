// src/types/rating.types.ts
// Rating Types – DTOs and response shapes for product ratings and reviews.

export interface CreateRatingDto {
  buyerId: string;
  productId: string;
  rating: number; // 1‑5
  comment?: string;
}

export interface RatingResponse {
  id: string;
  buyerId: string;
  productId: string;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}
