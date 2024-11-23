import "dotenv/config";
import fs from "fs";
import path from "path";
import { z } from "zod";

const envSchema = z.object({
  OPENROUTER_API_KEY: z.string().nonempty().optional(),
  APP_URL: z.string().nonempty().url(),
  APP_NAME: z.string().nonempty(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment variables:", parsedEnv.error.format());
  throw new Error("Invalid environment variables");
}

let openRouterApiKey: string | undefined;

const configPath = path.resolve("crkdrc.json");
if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  openRouterApiKey = config.openRouterApiKey;
}

if (!openRouterApiKey) {
  openRouterApiKey = parsedEnv.data.OPENROUTER_API_KEY;
}

if (!openRouterApiKey) {
  console.error(
    "OPENROUTER_API_KEY is not set in crkdrc.json or environment variables",
  );
  throw new Error("OPENROUTER_API_KEY is not set");
}

export const appEnv = {
  ...parsedEnv.data,
  OPENROUTER_API_KEY: openRouterApiKey,
};
