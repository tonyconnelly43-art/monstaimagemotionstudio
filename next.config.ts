import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These bundle a native platform binary resolved via runtime `require()`
  // paths that Turbopack/webpack can't statically analyze — keep them
  // external so Node resolves them normally at runtime.
  serverExternalPackages: ["fluent-ffmpeg", "@ffmpeg-installer/ffmpeg", "@ffprobe-installer/ffprobe"],
};

export default nextConfig;
