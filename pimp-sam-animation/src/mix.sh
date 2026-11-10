#!/usr/bin/env bash
# Theme song from the top (beat grid 0.19 + n*0.6265s) + Sam's cane-tap sound (from the
# show clip) on each cane landing: odd beats in option 2 and the cane plant in option 3.
set -euo pipefail
cd "$(dirname "$0")/.."
TAPS="5.829 7.082 8.334 12.100"
N=0; F=""; L=""
for t in $TAPS; do ms=$(python3 -c "print(int($t*1000))"); F="$F[2:a]aresample=48000,atrim=0.72:1.3,asetpts=PTS-STARTPTS,afade=t=out:st=0.35:d=0.2,volume=0.45,adelay=${ms}|${ms},apad[t$N];"; L="$L[t$N]"; N=$((N+1)); done
ffmpeg -y -loglevel error -i build/video_only.mp4 -i assets/theme.mp3 -i ../pimp-sam-intro/assets/clips/03-sam-grande.mp4 -filter_complex "
[1:a]aresample=48000,atrim=duration=19.5,afade=t=out:st=18.6:d=0.9[mu];$F
[mu]${L}amix=inputs=$((N+1)):duration=first:normalize=0,alimiter=limit=0.9:level=false[a]" \
 -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart -t 19.5 pimp-sam-animation-options.mp4
echo "wrote pimp-sam-animation-options.mp4"
