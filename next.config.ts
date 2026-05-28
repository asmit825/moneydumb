import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude better-sqlite3 from serverless bundles (only used in local dev)
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
