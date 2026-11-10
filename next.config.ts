import type { NextConfig } from "next";

// GitHub Pages 등 하위 경로 배포 시: NEXT_PUBLIC_BASE_PATH=/toeic npm run build
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
