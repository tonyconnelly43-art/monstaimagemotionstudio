import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These bundle a native platform binary resolved via runtime `require()`
  // paths that Turbopack/webpack can't statically analyze — keep them
  // external so Node resolves them normally at runtime.
  // potrace/jimp are here for a different reason: jimp's package.json has a
  // `browser` field that Turbopack picks over `main` when bundling, which
  // breaks Potrace's internal `instanceof Jimp` check ("Right-hand side of
  // 'instanceof' is not callable") — keeping it external forces a normal
  // Node `require` instead.
  serverExternalPackages: [
    "fluent-ffmpeg",
    "@ffmpeg-installer/ffmpeg",
    "@ffprobe-installer/ffprobe",
    "potrace",
    "jimp",
  ],
};

export default nextConfig;
