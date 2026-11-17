/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "pdfjs-dist",
      "@napi-rs/canvas",
    ],
  },
};

export default nextConfig;