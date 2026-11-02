#!/usr/bin/env bash
# Theme song from 7.0s (so "the town called Macksville" hits the tower close-up), plus the Sam clip's cane tap (clip audio otherwise muted).
set -euo pipefail
cd "$(dirname "$0")/.."
ffmpeg -y -loglevel error -i build/video_only.mp4 -i assets/theme.mp3 -i assets/clips/03-sam-grande.mp4 -filter_complex "
[1:a]aresample=48000,atrim=start=7.0:duration=23.5,asetpts=PTS-STARTPTS,afade=t=in:d=0.04,afade=t=out:st=22.3:d=1.2[mu];
[2:a]aresample=48000,atrim=0.6:1.4,asetpts=PTS-STARTPTS,afade=t=out:st=0.5:d=0.3,adelay=14340|14340,volume=0.6,apad[tap];
[mu][tap]amix=inputs=2:duration=first:normalize=0,volume=${GAIN:-0dB},alimiter=limit=0.95:level=false[a]" \
 -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart -t 23.5 pimp-sam-intro.mp4
echo "wrote pimp-sam-intro.mp4"
