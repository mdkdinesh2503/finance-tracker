export function requireEnv(name: "DATABASE_URL" | "JWT_SECRET"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

