#!/usr/bin/env bash
# Mixes voiceover + music under the rendered video.
# Music starts at the song's beat drop (16.3s), ducks under the VO, then
# swells back to full volume once the VO finishes (~22.2s video time).
set -euo pipefail
cd "$(dirname "$0")/.."
VO_DELAY_MS=1000
MUSIC_START=16.3
DUR=27
ffmpeg -y -loglevel error -i build/video_only.mp4 -i assets/audio/voiceover.mp3 -i assets/audio/hip-hop-cover.mp3 -filter_complex "
[1:a]aresample=48000,highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=2,volume=1.25,adelay=${VO_DELAY_MS}|${VO_DELAY_MS},apad[vo];
[2:a]aresample=48000,atrim=start=${MUSIC_START}:duration=${DUR},asetpts=PTS-STARTPTS,
 volume='if(lt(t,0.6),0.8, if(lt(t,1.0),0.8-0.6*(t-0.6)/0.4, if(lt(t,22.2),0.2, if(lt(t,22.9),0.2+0.8*(t-22.2)/0.7, 1.0))))':eval=frame,
 afade=t=in:d=0.3,afade=t=out:st=25.4:d=1.6[mu];
[vo][mu]amix=inputs=2:duration=longest:normalize=0,atrim=duration=${DUR},volume=3.5dB,alimiter=limit=0.95:level=false[a]" \
 -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart -t ${DUR} monsta-brand-experience.mp4
echo "wrote monsta-brand-experience.mp4"
