import packageJson from "../package.json";

export function getAppVersion(): string {
  return packageJson.version || "1.0.0";
}

export function getAppEnvironment(): string {
  const env = (process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "development")
    .trim()
    .toLowerCase();

  if (env === "production" || env === "prod") return "Production";
  if (env === "staging" || env === "stage") return "Staging";
  if (env === "development" || env === "dev") return "Development";
  if (env === "test" || env === "testing") return "Testing";

  return env.charAt(0).toUpperCase() + env.slice(1);
}

export const APP_CONFIG = {
  name: "RetailFlow",
  supportEmail: "farhan.ngodingai@gmail.com",
} as const;
