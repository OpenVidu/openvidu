#!/bin/bash

# DEBUG MODE
DEBUG_MODE=${DEBUG_MODE:-false}
if [[ ${DEBUG_MODE} == true ]]; then
  DEBUG_CHROME_FLAGS="--enable-logging --v=1"
fi

{
  ### Variables ###

  URL=${URL:-https://www.youtube.com/watch?v=JMuzlEQz3uo}
  ONLY_VIDEO=${ONLY_VIDEO:-false}
  RESOLUTION=${RESOLUTION:-1280x720}
  FRAMERATE=${FRAMERATE:-25}
  WIDTH="$(cut -d'x' -f1 <<<$RESOLUTION)"
  HEIGHT="$(cut -d'x' -f2 <<<$RESOLUTION)"
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

  echo
  echo "============= Loaded Environment Variables ============="
  env
  echo "========================================================"
  echo

  ### Store Recording json data ###

  mkdir -p /recordings/$VIDEO_ID
  chmod 777 /recordings/$VIDEO_ID
  echo $RECORDING_JSON >/recordings/$VIDEO_ID/.recording.$VIDEO_ID

  ### Run headless Chrome ###

  source /headless-chrome.sh

  chmod 777 /recordings

  ### Start recording with ffmpeg ###

  if [[ "$ONLY_VIDEO" == true ]]; then
    # Do not record audio
    ffmpeg <./stop -y -f x11grab -draw_mouse 0 -framerate $FRAMERATE -video_size $RESOLUTION -i :$DISPLAY_NUM -c:v libx264 -preset ultrafast -crf 28 -refs 4 -qmin 4 -pix_fmt yuv420p -filter:v fps=$FRAMERATE "/recordings/$VIDEO_ID/$VIDEO_NAME.$VIDEO_FORMAT"
  else
    # Record audio  ("-f alsa -i pulse [...] -c:a aac")
    ffmpeg <./stop -y -f alsa -i pulse -f x11grab -draw_mouse 0 -framerate $FRAMERATE -video_size $RESOLUTION -i :$DISPLAY_NUM -c:a aac -c:v libx264 -preset ultrafast -crf 28 -refs 4 -qmin 4 -pix_fmt yuv420p -filter:v fps=$FRAMERATE "/recordings/$VIDEO_ID/$VIDEO_NAME.$VIDEO_FORMAT"
  fi

  ### Generate video report file ###
  ffprobe -v quiet -print_format json -show_format -show_streams /recordings/$VIDEO_ID/$VIDEO_NAME.$VIDEO_FORMAT >/recordings/$VIDEO_ID/$VIDEO_ID.info

  ### Update Recording json data ###

  TMP=$(mktemp /recordings/$VIDEO_ID/.$VIDEO_ID.XXXXXXXXXXXXXXXXXXXXXXX.json)
  INFO=$(cat /recordings/$VIDEO_ID/$VIDEO_ID.info | jq '.')
  HAS_AUDIO_AUX=$(echo $INFO | jq '.streams[] | select(.codec_type == "audio")')
  if [ -z "$HAS_AUDIO_AUX" ]; then HAS_AUDIO=false; else HAS_AUDIO=true; fi
  HAS_VIDEO_AUX=$(echo $INFO | jq '.streams[] | select(.codec_type == "video")')
  if [ -z "$HAS_VIDEO_AUX" ]; then HAS_VIDEO=false; else HAS_VIDEO=true; fi
  SIZE=$(echo $INFO | jq '.format.size | tonumber')
  DURATION=$(echo $INFO | jq '.format.duration | tonumber')

  if [[ "$HAS_AUDIO" == false && "$HAS_VIDEO" == false ]]; then
    STATUS="failed"
  else
    STATUS="stopped"
  fi

  jq -c -r ".hasAudio=$HAS_AUDIO | .hasVideo=$HAS_VIDEO | .duration=$DURATION | .size=$SIZE | .status=\"$STATUS\"" "/recordings/$VIDEO_ID/.recording.$VIDEO_ID" >$TMP && mv $TMP /recordings/$VIDEO_ID/.recording.$VIDEO_ID

  ### Generate video thumbnail ###

  MIDDLE_TIME=$(ffmpeg -i /recordings/$VIDEO_ID/$VIDEO_NAME.$VIDEO_FORMAT 2>&1 | grep Duration | awk '{print $2}' | tr -d , | awk -F ':' '{print ($3+$2*60+$1*3600)/2}')
  THUMBNAIL_HEIGHT=$((480 * $HEIGHT / $WIDTH))
  ffmpeg -ss $MIDDLE_TIME -i /recordings/$VIDEO_ID/$VIDEO_NAME.$VIDEO_FORMAT -vframes 1 -s 480x$THUMBNAIL_HEIGHT /recordings/$VIDEO_ID/$VIDEO_ID.jpg

  ### Change permissions to all generated files ###

  sudo chmod -R 777 /recordings/$VIDEO_ID

} 2>&1 | tee -a /tmp/container.log

if [[ ${DEBUG_MODE} == "true" ]]; then
  [[ -f /tmp/container.log ]] && cp /tmp/container.log /recordings/$VIDEO_ID/$VIDEO_ID-container.log || echo "/tmp/container.log not found"
  [[ -f ~/.config/google-chrome/chrome_debug.log ]] && cp ~/.config/google-chrome/chrome_debug.log /recordings/$VIDEO_ID/chrome_debug.log || echo "~/.config/google-chrome/chrome_debug.log"
fi

### Change permissions to all generated files ###
sudo chmod -R 777 /recordings/$VIDEO_ID
