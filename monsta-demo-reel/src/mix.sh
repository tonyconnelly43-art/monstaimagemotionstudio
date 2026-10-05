#!/usr/bin/env bash
# Mixes intro/closing VO and "Overdrive" under the rendered reel.
# The song starts at 20.47s so its drop (25.67s) lands on the logo slam at 5.2s.
set -euo pipefail
cd "$(dirname "$0")/.."
DUR=45
MUSIC_START=20.47
INTRO_MS=350
CLOSING_MS=39500
GAIN=${GAIN:-0dB}
ffmpeg -y -loglevel error -i build/video_only.mp4 -i assets/audio/vo-intro.mp3 -i assets/audio/vo-closing.mp3 -i assets/audio/overdrive.mp3 -filter_complex "
[1:a]aresample=48000,highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=2,volume=1.3,adelay=${INTRO_MS}|${INTRO_MS},apad[vi];
[2:a]aresample=48000,highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=2,volume=1.3,adelay=${CLOSING_MS}|${CLOSING_MS},apad[vc];
[3:a]aresample=48000,atrim=start=${MUSIC_START}:duration=${DUR},asetpts=PTS-STARTPTS,
 volume='if(lt(t,4.3),0.4, if(lt(t,5.15),0.4+0.6*(t-4.3)/0.85, if(lt(t,39.2),1.0, if(lt(t,39.45),1.0-0.72*(t-39.2)/0.25, if(lt(t,43.4),0.28, 0.28+0.42*min(1,(t-43.4)/0.4))))))':eval=frame,
 afade=t=in:d=0.2,afade=t=out:st=44.0:d=1.0[mu];
[vi][vc][mu]amix=inputs=3:duration=longest:normalize=0,atrim=duration=${DUR},volume=${GAIN},alimiter=limit=0.95:level=false[a]" \
 -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart -t ${DUR} monsta-demo-reel.mp4
echo "wrote monsta-demo-reel.mp4"
