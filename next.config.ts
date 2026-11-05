import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return ["/maps/:path*", "/sounds/:path*", "/textures/:path*"].map(source => ({
      source, headers: [{ key: "Cache-Control", value: "public, max-age=3600, must-revalidate" }],
    }));
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
      },
    },
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "flagcdn.com",
      },
    ],
  },
};

export default nextConfig;