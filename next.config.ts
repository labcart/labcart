import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/ide',
  env: {
    NEXT_PUBLIC_BASE_PATH: '/ide'
  },
  images: {
    unoptimized: true
  }
};

export default nextConfig;
