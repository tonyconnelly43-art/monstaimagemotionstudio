#!/usr/bin/env bash
# Mixes music, synthesized SFX and the closing VO under the rendered puzzle sting.
# "Punchier 808 Bass" starts at 8.89s so its bass drop (16.09s) hits the lock at 7.2s.
set -euo pipefail
cd "$(dirname "$0")/.."
DUR=14.5
MUSIC_START=8.89
VO_MS=8400
GAIN=${GAIN:-0dB}
VIDEO=${VIDEO:-build/video_only.mp4}
OUT=${OUT:-monsta-puzzle-logo.mp4}
ffmpeg -y -loglevel error -i "$VIDEO" -i assets/audio/vo-closing.mp3 -i assets/audio/punchier-808-bass.mp3 -i assets/audio/sfx.wav -filter_complex "
[1:a]aresample=48000,highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=2,volume=1.5,adelay=${VO_MS}|${VO_MS},apad[vo];
[2:a]aresample=48000,atrim=start=${MUSIC_START}:duration=${DUR},asetpts=PTS-STARTPTS,
 volume='if(lt(t,7.15),2.4, if(lt(t,8.2),1.0, if(lt(t,8.45),1.0-0.62*(t-8.2)/0.25, if(lt(t,12.3),0.38, 0.38+0.62*min(1,(t-12.3)/0.5)))))':eval=frame,
 afade=t=in:d=0.4,afade=t=out:st=13.6:d=0.9[mu];
[3:a]aresample=48000,volume=1.0[fx];
[vo][mu][fx]amix=inputs=3:duration=longest:normalize=0,atrim=duration=${DUR},volume=${GAIN},alimiter=limit=0.95:level=false[a]" \
 -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart -t ${DUR} "$OUT"
echo "wrote $OUT"
