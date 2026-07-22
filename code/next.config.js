/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /*
   * Static export. The whole app runs in the browser -- the tax engine is pure
   * TypeScript with no server calls -- so there's nothing to run on a server.
   * `next build` writes a plain `out/` folder that any static host serves
   * (Cloudflare Pages, GitHub Pages, Netlify, Vercel). No Node runtime, no bill.
   */
  output: "export",

  // Static export can't use the on-the-fly image optimizer. We don't use
  // next/image, but this keeps the door open without needing a server.
  images: { unoptimized: true },

  // Emit /path/index.html instead of /path.html, so links work on every host
  // without server-side rewrite rules.
  trailingSlash: true,
};

module.exports = nextConfig;
