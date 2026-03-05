import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { User, IUser } from "../../models/user.model";
import { UserProfile } from "../../models/profile.model";
import { hashPassword, comparePassword } from "../../utils/hash";
import { normalizeEmail } from "../../utils/normalize";
import { config } from "../../config/env";

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export class AuthService {
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = normalizeEmail(dto.email);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error("Το email χρησιμοποιείται ήδη");
    }

    const passwordHash = await hashPassword(dto.password);
    const user = await User.create({
      email,
      passwordHash,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      role: "user",
    });

    // Create empty profile
    await UserProfile.create({
      userId: user._id,
    });

    const token = this.generateToken(user);
    return {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const email = normalizeEmail(dto.email);
    const user = await User.findOne({ email });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isValid = await comparePassword(dto.password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    const token = this.generateToken(user);
    return {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async getMe(userId: string): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    return {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }

  private generateToken(user: IUser): string {
    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const secret: Secret = config.jwt.secret;
    const options: SignOptions = {
      // config.jwt.expiresIn is a string from env (e.g. "7d"), which is valid for jsonwebtoken
      expiresIn: config.jwt.expiresIn as any,
    };

    return jwt.sign(payload, secret, options);
  }
}
