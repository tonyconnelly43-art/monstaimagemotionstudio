#!/usr/bin/env bash
# VO at 0.8s, music from 15.59s so the 808 drop lands with the first landing (0.5s), ducked under the VO.
set -euo pipefail
cd "$(dirname "$0")/.."
ffmpeg -y -loglevel error -i build/video_only.mp4 -i assets/audio/vo.mp3 -i assets/audio/music.mp3 -i assets/audio/sfx.wav -filter_complex "
[1:a]aresample=48000,highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=2,volume=1.5,adelay=800|800,apad[vo];
[2:a]aresample=48000,atrim=start=15.59:duration=8.6,asetpts=PTS-STARTPTS,
 volume='if(lt(t,0.7),1.0, if(lt(t,0.85),1.0-0.65*(t-0.7)/0.15, if(lt(t,4.75),0.35, 0.35+0.65*min(1,(t-4.75)/0.3))))':eval=frame,afade=t=out:st=7.9:d=0.7[mu];
[3:a]aresample=48000,volume=0.8[fx];
[vo][mu][fx]amix=inputs=3:duration=longest:normalize=0,atrim=duration=8.6,volume=${GAIN:-0dB},alimiter=limit=0.95:level=false[a]" \
 -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart -t 8.6 cartoon-demo.mp4
echo "wrote cartoon-demo.mp4"
