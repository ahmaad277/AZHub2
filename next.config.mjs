/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep server-only database packages external so `next start` can load them
  // directly from node_modules in local/staging production runtime.
  serverExternalPackages: ["drizzle-orm", "postgres"],
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ["app", "components", "lib", "db"],
  },
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;
