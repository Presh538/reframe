

const nextConfig = {
  // Strict mode catches subtle bugs early
  reactStrictMode: true,

  // Security: restrict which domains images can load from
  images: {
    domains: [],
  },

  // Expose only public env vars to the client bundle
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    NEXT_PUBLIC_APP_NAME: 'The Reframe',
  },

  // Webpack: handle gif.js worker file correctly
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    }
    return config
  },
}

export default nextConfig
