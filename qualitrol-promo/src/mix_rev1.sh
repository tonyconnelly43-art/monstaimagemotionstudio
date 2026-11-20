#!/usr/bin/env bash
# Revision 1 mix: the single ElevenLabs read (assets/audio/vo-rev1.mp3) is cut at its natural pauses
# and each line is placed against the picture; music bed ducks under the voice; loudness -16 LUFS.
#   line       source (s)      placed at (s)
#   hook       0.00 - 5.30     0.8
#   VFD        5.60 - 12.75    7.3
#   PLC       13.15 - 18.85   16.3
#   HMI       19.20 - 23.70   24.7
#   warranty  24.10 - 32.80   32.1   (checks land on "evaluated" 32.2, "load tested" 33.95, "18-month" 35.7, "shelf life" 38.2)
#   close     33.15 - 40.12   41.6   (CLOSE_END=34.70 keeps only "Qualitrol International.", used for the Roddy Knox end card)
set -euo pipefail
cd "$(dirname "$0")/.."
VIDEO=${VIDEO:-build/rev1_video.mp4}; OUT=${OUT:-qualitrol-rev1-vfd-plc-hmi.mp4}
ffmpeg -y -loglevel error -i assets/audio/vo-rev1.mp3 -i assets/audio/bed-rev1.wav -i assets/audio/sfx-rev1.wav -i "$VIDEO" -filter_complex "
[0:a]aresample=48000[v0];[v0]asplit=6[a1][a2][a3][a4][a5][a6];
[a1]atrim=0:5.30,asetpts=PTS-STARTPTS,adelay=800|800[l1];
[a2]atrim=5.60:12.75,asetpts=PTS-STARTPTS,afade=t=in:d=0.04,adelay=7300|7300[l2];
[a3]atrim=13.15:18.85,asetpts=PTS-STARTPTS,afade=t=in:d=0.04,adelay=16300|16300[l3];
[a4]atrim=19.20:23.70,asetpts=PTS-STARTPTS,afade=t=in:d=0.04,adelay=24700|24700[l4];
[a5]atrim=24.10:32.80,asetpts=PTS-STARTPTS,afade=t=in:d=0.04,adelay=32100|32100[l5];
[a6]atrim=33.15:${CLOSE_END:-40.12},asetpts=PTS-STARTPTS,afade=t=in:d=0.04,areverse,afade=t=in:d=0.12,areverse,adelay=41600|41600[l6];
[l1][l2][l3][l4][l5][l6]amix=inputs=6:normalize=0:duration=longest,highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=2,apad=whole_dur=50[vo];
[vo]asplit=2[vo1][vokey];
[1:a]aresample=48000,volume=${BED:-0.55}[bed];
[bed][vokey]sidechaincompress=threshold=0.05:ratio=4:attack=40:release=500[bedd];
[2:a]aresample=48000,volume=${FX:-0.7}[fx];
[vo1][bedd][fx]amix=inputs=3:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a]" \
 -map 3:v -map "[a]" -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart -t 50 "$OUT"
echo "wrote $OUT"
