import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: process.env.VINEXT_OUTPUT_MODE === 'standalone' ? 'standalone' : undefined,
};

export default nextConfig;
