import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/solo/deal": ["./src/data/listings.json"],
    "/api/solo/score": ["./src/data/listings.json"],
    "/api/solo/counts": ["./src/data/listings.json"],
  },
};

export default nextConfig;
