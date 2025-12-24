import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { registerSchema, loginSchema } from "../../../../shared/src/zodSchemas";

const authService = new AuthService();

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const {
      email,
      password,
      passwordConfirm,
      firstName,
      lastName,
      acceptTerms,
    } = req.body;

    // Validate with Zod
    const validationResult = registerSchema.safeParse({
      email,
      password,
      passwordConfirm,
      firstName,
      lastName,
      acceptTerms,
    });

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      res.status(400).json({
        error: "Validation failed",
        errors,
      });
      return;
    }

    if (!acceptTerms) {
      res
        .status(400)
        .json({ error: "Πρέπει να αποδεχτείτε τους όρους χρήσης" });
      return;
    }

    const result = await authService.register({
      email,
      password,
      firstName,
      lastName,
    });
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    // Validate with Zod
    const validationResult = loginSchema.safeParse({ email, password });

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      res.status(400).json({
        error: "Validation failed",
        errors,
      });
      return;
    }

    const result = await authService.login({ email, password });
    res.status(200).json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;
    const user = await authService.getMe(userId);
    res.status(200).json(user);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  // Stateless JWT - logout is handled client-side
  res.status(200).json({ message: "Logged out" });
}
