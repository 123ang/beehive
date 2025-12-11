/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@beehive/shared"],
  images: {
    domains: ["api.beehive.io", "ipfs.io"],
  },
  async rewrites() {
    // In production, if NEXT_PUBLIC_API_URL is not set, proxy to localhost:4001
    // In development, use the environment variable or default to localhost:4000
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl && !apiUrl.startsWith("/")) {
      // Absolute URL - proxy to external API
      return [
        {
          source: "/api/:path*",
          destination: `${apiUrl}/api/:path*`,
        },
      ];
    }
    // No API URL set or relative path - proxy to local API server
    const defaultApiUrl = process.env.NODE_ENV === "production" 
      ? "http://localhost:4001" 
      : "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${defaultApiUrl}/api/:path*`,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Fix for WalletConnect, MetaMask SDK, and other Web3 libraries
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        "pino-pretty": false,
      };
    }

    // Ignore problematic modules that are React Native specific
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": false,
    };

    // Externalize problematic packages during SSR
    if (isServer) {
      config.externals = [...(config.externals || []), "pino-pretty"];
    }

    return config;
  },
};

module.exports = nextConfig;
