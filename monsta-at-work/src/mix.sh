#!/usr/bin/env bash
# Replaces the clip's audio: synthesized SFX + "Punchier 808 Bass" from 5.09s, so the song's
# quiet build sits under the work scenes and its bass drop (16.09s) hits the landing at 11.0s.
set -euo pipefail
cd "$(dirname "$0")/.."
VIDEO=${VIDEO:-assets/monsta-at-work-original.mp4}
DUR=${DUR:-15.1}
ffmpeg -y -loglevel error -i "$VIDEO" -i assets/sfx.wav -i assets/punchier-808-bass.mp3 -filter_complex "
[2:a]aresample=48000,atrim=start=5.09:duration=${DUR},asetpts=PTS-STARTPTS,
 volume='if(lt(t,10.95),1.9,0.85)':eval=frame,afade=t=in:d=0.3,afade=t=out:st=$(python3 -c "print(${DUR}-1.2)"):d=1.2[mu];
[1:a]aresample=48000,volume=0.8[fx];
[mu][fx]amix=inputs=2:duration=first:normalize=0,volume=${GAIN:-0dB},alimiter=limit=0.88:level=false[a]" \
 -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart -t ${DUR} monsta-at-work.mp4
echo "wrote monsta-at-work.mp4"
