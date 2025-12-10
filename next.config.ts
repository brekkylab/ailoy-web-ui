import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  turbopack: {
    root: "../",
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
