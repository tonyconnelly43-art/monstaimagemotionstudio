#!/usr/bin/env bash
# SFX bed + closing VO. "Monsta Media & Design" starts 0.35s after the signal locks (7.0s);
# "Branding that eats the competition" lands as the camera comes through the glass (~9.3s).
set -euo pipefail
cd "$(dirname "$0")/.."
VIDEO=${VIDEO:-build/video_only.mp4}; OUT=${OUT:-monsta-tv-reveal.mp4}
ffmpeg -y -loglevel error -i "$VIDEO" -i assets/audio/sfx.wav -i assets/audio/vo-closing.mp3 -filter_complex "
[2:a]aresample=48000,highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=2,volume=1.6,adelay=7350|7350,apad[vo];
[1:a]aresample=48000,volume=0.9[fx];
[fx][vo]amix=inputs=2:duration=first:normalize=0,volume=${GAIN:-0dB},alimiter=limit=0.85:level=false[a]" \
 -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart -t 12.5 "$OUT"
echo "wrote $OUT"
