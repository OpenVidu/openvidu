#!/bin/bash

### Variables ###

URL=${URL:-https://www.youtube.com/watch?v=JMuzlEQz3uo}
ONLY_VIDEO=${ONLY_VIDEO:-false}
RESOLUTION=${RESOLUTION:-1280x720}
FRAMERATE=${FRAMERATE:-25}
WIDTH="$(cut -d'x' -f1 <<< $RESOLUTION)"
HEIGHT="$(cut -d'x' -f2 <<< $RESOLUTION)"
VIDEO_ID=${VIDEO_ID:-video}
VIDEO_NAME=${VIDEO_NAME:-video}
VIDEO_FORMAT=${VIDEO_FORMAT:-mp4}
RECORDING_JSON="${RECORDING_JSON}"

export URL
export ONLY_VIDEO
export RESOLUTION
export FRAMERATE
export WIDTH
export HEIGHT
export VIDEO_ID
export VIDEO_NAME
export VIDEO_FORMAT
export RECORDING_JSON

### Store Recording json data ###

mkdir /recordings/$VIDEO_ID
chmod 777 /recordings/$VIDEO_ID
echo $RECORDING_JSON > /recordings/$VIDEO_ID/.recording.$VIDEO_ID

pulseaudio -D

### Start Chrome in headless mode with xvfb, using an automatically provided free display num ###

touch xvfb.log
chmod 777 xvfb.log
xvfb-run --auto-servernum --server-args="-ac -screen 0 ${RESOLUTION}x24 -noreset" firefox --width $WIDTH --height $HEIGHT $URL &> xvfb.log &
touch stop
chmod 777 /recordings

until pids=$(pidof Xvfb)
do   
    sleep 0.1
done

### Calculate the display num in use parsing args of command "Xvfb"

XVFB_ARGS=$(ps -eo args | grep [X]vfb)
DISPLAY_NUM=$(echo $XVFB_ARGS | sed 's/Xvfb :\([0-9]\+\).*/\1/')
echo "Display in use -> :$DISPLAY_NUM"
echo "----------------------------------------"

sleep 5

### Start recording with ffmpeg ###

if [[ "$ONLY_VIDEO" == true ]]
  then
     # Do not record audio
     <./stop ffmpeg -y -f x11grab -draw_mouse 0 -framerate $FRAMERATE -video_size $RESOLUTION -i :$DISPLAY_NUM -c:v libx264 -preset ultrafast -crf 28 -refs 4 -qmin 4 -pix_fmt yuv420p -filter:v fps=$FRAMERATE "/recordings/$VIDEO_ID/$VIDEO_NAME.$VIDEO_FORMAT"
  else
     # Record audio  ("-f alsa -i pulse [...] -c:a aac")
     <./stop ffmpeg -y -f alsa -i pulse -f x11grab -draw_mouse 0 -framerate $FRAMERATE -video_size $RESOLUTION -i :$DISPLAY_NUM -c:a aac -c:v libx264 -preset ultrafast -crf 28 -refs 4 -qmin 4 -pix_fmt yuv420p -filter:v fps=$FRAMERATE "/recordings/$VIDEO_ID/$VIDEO_NAME.$VIDEO_FORMAT"
fi

### Generate video report file ###
ffprobe -v quiet -print_format json -show_format -show_streams /recordings/$VIDEO_ID/$VIDEO_NAME.$VIDEO_FORMAT > /recordings/$VIDEO_ID/$VIDEO_ID.info

### Update Recording json data ###

TMP=$(mktemp /recordings/$VIDEO_ID/.$VIDEO_ID.XXXXXXXXXXXXXXXXXXXXXXX.json)
INFO=$(cat /recordings/$VIDEO_ID/$VIDEO_ID.info | jq '.')
HAS_AUDIO_AUX=$(echo $INFO | jq '.streams[] | select(.codec_type == "audio")')
if [ -z "$HAS_AUDIO_AUX" ]; then HAS_AUDIO=false; else HAS_AUDIO=true; fi
HAS_VIDEO_AUX=$(echo $INFO | jq '.streams[] | select(.codec_type == "video")')
if [ -z "$HAS_VIDEO_AUX" ]; then HAS_VIDEO=false; else HAS_VIDEO=true; fi
SIZE=$(echo $INFO | jq '.format.size | tonumber')
DURATION=$(echo $INFO | jq '.format.duration | tonumber')

if [[ "$HAS_AUDIO" == false && "$HAS_VIDEO" == false ]]
  then
    STATUS="failed"
  else
    STATUS="stopped"
fi

jq -c -r ".hasAudio=$HAS_AUDIO | .hasVideo=$HAS_VIDEO | .duration=$DURATION | .size=$SIZE | .status=\"$STATUS\"" "/recordings/$VIDEO_ID/.recording.$VIDEO_ID" > $TMP && mv $TMP /recordings/$VIDEO_ID/.recording.$VIDEO_ID

### Generate video thumbnail ###

MIDDLE_TIME=$(ffmpeg -i /recordings/$VIDEO_ID/$VIDEO_NAME.$VIDEO_FORMAT 2>&1 | grep Duration | awk '{print $2}' | tr -d , | awk -F ':' '{print ($3+$2*60+$1*3600)/2}')
THUMBNAIL_HEIGHT=$((480*$HEIGHT/$WIDTH))
ffmpeg -ss $MIDDLE_TIME -i /recordings/$VIDEO_ID/$VIDEO_NAME.$VIDEO_FORMAT -vframes 1 -s 480x$THUMBNAIL_HEIGHT /recordings/$VIDEO_ID/$VIDEO_ID.jpg

### Change permissions to all generated files ###

sudo chmod -R 777 /recordings/$VIDEO_ID