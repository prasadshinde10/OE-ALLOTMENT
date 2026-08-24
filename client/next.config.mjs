/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable persistent filesystem caching in dev mode to prevent OneDrive / Windows file-locking conflicts
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
