import { z } from "zod";

const configSchema = z.object({
  NEXT_PUBLIC_BACKEND_MODE: z.enum(["demo", "api"]).default("demo"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url().optional(),
  APP_ORIGIN: z.string().url().optional(),
  SESSION_COOKIE_SECURE: z.enum(["true", "false"]).optional(),
}).passthrough().superRefine((value, context) => {
  if (value.NEXT_PUBLIC_BACKEND_MODE === "api") {
    if (!value.DATABASE_URL) context.addIssue({ code: "custom", path: ["DATABASE_URL"], message: "DATABASE_URL is required in API mode" });
    if (!value.APP_ORIGIN) context.addIssue({ code: "custom", path: ["APP_ORIGIN"], message: "APP_ORIGIN is required in API mode" });
  }
  if (value.NODE_ENV === "production" && value.NEXT_PUBLIC_BACKEND_MODE === "api" && value.SESSION_COOKIE_SECURE !== "true") {
    context.addIssue({ code: "custom", path: ["SESSION_COOKIE_SECURE"], message: "Secure cookies are required in production API mode" });
  }
});

export interface ServerConfig {
  mode: "demo" | "api";
  nodeEnv: "development" | "test" | "production";
  databaseUrl?: string;
  appOrigin: string;
  secureCookies: boolean;
}

export function readServerConfig(environment: Record<string, string | undefined>): ServerConfig {
  const value = configSchema.parse(environment);
  return {
    mode: value.NEXT_PUBLIC_BACKEND_MODE,
    nodeEnv: value.NODE_ENV,
    databaseUrl: value.DATABASE_URL,
    appOrigin: value.APP_ORIGIN ?? "http://localhost:3000",
    secureCookies: value.SESSION_COOKIE_SECURE === "true",
  };
}
