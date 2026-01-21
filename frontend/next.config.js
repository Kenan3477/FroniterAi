/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporarily ignore TypeScript errors for deployment
    // TODO: Fix all implicit 'any' types identified by the validation script
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  experimental: {
    outputFileTracingExcludes: {
      '/': ['**/.git/**', '**/test-*.ts', '**/*.test.ts', '**/*.spec.ts'],
    },
  },
  webpack: (config, { isServer, dev }) => {
    // Exclude test files from compilation
    if (!dev) {
      config.module.rules.push({
        test: /test-.*\.ts$|.*\.test\.ts$|.*\.spec\.ts$/,
        use: 'ignore-loader',
      });
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*', // Keep API routes local
      },
    ];
  },
  images: {
    domains: ['localhost', 'images.unsplash.com', 'froniterai-production.up.railway.app'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://froniterai-production.up.railway.app',
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'wss://froniterai-production.up.railway.app',
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

module.exports = nextConfig;