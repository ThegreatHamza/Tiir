import { z } from "zod";
import type { TFunction } from "i18next";

export const MIN_PASSWORD = 8;

export const emailSchema = (t: TFunction) => z.string().trim().min(1, t("validation.required")).email(t("validation.email"));
export const passwordSchema = (t: TFunction) => z.string().min(MIN_PASSWORD, t("validation.passwordMin", { count: MIN_PASSWORD }));

export const loginSchema = (t: TFunction) =>
  z.object({
    email: emailSchema(t),
    password: z.string().min(1, t("validation.required")),
  });

export const signupSchema = (t: TFunction) =>
  z
    .object({
      fullName: z.string().trim().min(1, t("validation.required")).max(120),
      companyName: z.string().trim().min(1, t("validation.required")).max(200),
      country: z.enum(["DJ", "ET"]),
      currency: z.enum(["DJF", "ETB", "USD"]),
      email: emailSchema(t),
      password: passwordSchema(t),
      confirmPassword: z.string(),
    })
    .refine((v) => v.password === v.confirmPassword, { message: t("validation.passwordMismatch"), path: ["confirmPassword"] });

export const newPasswordSchema = (t: TFunction) =>
  z
    .object({ password: passwordSchema(t), confirmPassword: z.string() })
    .refine((v) => v.password === v.confirmPassword, { message: t("validation.passwordMismatch"), path: ["confirmPassword"] });
