import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // The subgraph API key and the gate URL are read in server components and
  // route handlers only. Nothing here is exposed with NEXT_PUBLIC_ except the
  // World app id, which is public by design.
  env: {},
};

export default nextConfig;
