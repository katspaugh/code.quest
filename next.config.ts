import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "";
const normalizedBasePath = basePath && basePath !== "/" ? basePath : "";
const assetPrefix = normalizedBasePath ? `${normalizedBasePath}/` : undefined;

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: normalizedBasePath || undefined,
  assetPrefix,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
