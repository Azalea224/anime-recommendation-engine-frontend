import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  env: {
    // Expose EXPRESS_URI as NEXT_PUBLIC_API_URL for client-side access
    NEXT_PUBLIC_API_URL: process.env.EXPRESS_URI || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  },
};

export default nextConfig;
