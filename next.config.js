/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // NEXT_DIST_DIR permite compilar uma cópia separada (ex.: .next-demo) para
  // demonstração, sem conflito com os builds de desenvolvimento.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

module.exports = nextConfig;
