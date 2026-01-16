import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isProduction ? "/code.quest" : undefined,
  assetPrefix: isProduction ? "/code.quest/" : undefined,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
