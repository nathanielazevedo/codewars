/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@code-arena/types', '@code-arena/db'],
}

export default nextConfig
