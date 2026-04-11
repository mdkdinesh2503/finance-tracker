import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native addon: must not be bundled for serverless (e.g. Vercel) or verify/hash can fail at runtime.
  serverExternalPackages: ["@node-rs/argon2"],
};

export default nextConfig;
