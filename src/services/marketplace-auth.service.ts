import { ProductCategory } from "@prisma/client";
import { MarketplaceAuthRepository } from "../repositories/marketplace-auth.repository";
import { hashPassword, comparePassword } from "../utils/password";
import { generateToken } from "../utils/jwt";
import { ApiError } from "../utils/apiError";

export type RegisterInput =
  | {
      role: "BUYER";
      email: string;
      password: string;
      fullName: string;
      address: string;
      picture?: string;
    }
  | {
      role: "VENDOR";
      email: string;
      password: string;
      fullName: string;
      contact: string;
      businessName: string;
      proof: string;
      location: string;
      currentState: string;
      businessRegistrationNumber: string;
      vendorPicture: string;
      businessPicture: string;
      categories?: string[];
    };

export interface LoginInput {
  email: string;
  password: string;
}

const repository = new MarketplaceAuthRepository();

export class MarketplaceAuthService {
  async register(data: RegisterInput) {
    const existingUser = await repository.findUserByEmail(data.email);
    if (existingUser) {
      throw new ApiError(400, "Email already registered");
    }

    const passwordHash = await hashPassword(data.password);
    let user;

    if (data.role === "BUYER") {
      user = await repository.createBuyerUser({
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        address: data.address,
        picture: data.picture,
      });
    } else {
      user = await repository.createVendorUser({
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        contact: data.contact,
        businessName: data.businessName,
        proof: data.proof,
        location: data.location,
        currentState: data.currentState,
        businessRegistrationNumber: data.businessRegistrationNumber,
        vendorPicture: data.vendorPicture,
        businessPicture: data.businessPicture,
        categories: data.categories,
      });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  async login(data: LoginInput) {
    const user = await repository.findUserByEmail(data.email);
    if (!user) {
      throw new ApiError(401, "Invalid email or password");
    }

    const isValid = await comparePassword(data.password, user.passwordHash);
    if (!isValid) {
      throw new ApiError(401, "Invalid email or password");
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }
}