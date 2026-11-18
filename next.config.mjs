/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Next's default 1 MB Server Action limit is too small for PDF uploads.
    // On Vercel, requests may still have a lower platform-level payload limit;
    // large files require direct-to-Storage uploads in a future update.
    serverActions: { bodySizeLimit: '25mb' },
    serverComponentsExternalPackages: [
      "pdfjs-dist",
      "@napi-rs/canvas",
    ],
  },
};

export default nextConfig;