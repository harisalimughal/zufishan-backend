import { describe, expect, it } from "vitest";
import { generateRefreshToken, generateToken, verifyRefreshToken, verifyToken } from "../src/utils/jwt";
import { productQuerySchema } from "../src/validators/marketplace-product.validator";
import { canTransitionPayment } from "../src/services/marketplace-payment.service";

const payload = { id: "user_123", email: "buyer@example.com", role: "BUYER" };

describe("marketplace security boundaries", () => {
  it("does not accept refresh tokens as access tokens", () => {
    const access = generateToken(payload);
    const refresh = generateRefreshToken(payload);

    expect(verifyToken(access)?.type).toBe("ACCESS");
    expect(verifyToken(refresh)).toBeNull();
    expect(verifyRefreshToken(refresh)?.type).toBe("REFRESH");
    expect(verifyRefreshToken(access)).toBeNull();
  });

  it("coerces and validates product query values", () => {
    expect(productQuerySchema.parse({ isActive: "false", minPrice: "10", take: "20" })).toEqual({
      isActive: false,
      minPrice: 10,
      take: 20,
    });
    expect(() => productQuerySchema.parse({ minPrice: "20", maxPrice: "10" })).toThrow();
  });

  it("allows only monotonic payment transitions", () => {
    expect(canTransitionPayment("PENDING", "PAID")).toBe(true);
    expect(canTransitionPayment("PAID", "REFUNDED")).toBe(true);
    expect(canTransitionPayment("REFUNDED", "PAID")).toBe(false);
    expect(canTransitionPayment("CANCELLED", "PAID")).toBe(false);
  });
});
