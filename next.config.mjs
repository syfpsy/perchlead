/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["@heroui/react", "@heroui-pro/react", "lucide-react"],
  },
};

export default nextConfig;
