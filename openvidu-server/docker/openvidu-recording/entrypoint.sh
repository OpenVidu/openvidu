#!/bin/bash

adduser --uid $USER_ID --disabled-password --gecos "" myuser

URL="${URL:-https://www.youtube.com/watch?v=JMuzlEQz3uo}"
RESOLUTION="${RESOLUTION:-1920x1080}"
FRAMERATE="${FRAMERATE:-30}"
VIDEO_SIZE="$RESOLUTION"
ARRAY=(${VIDEO_SIZE//x/ })
VIDEO_NAME="${VIDEO_NAME:-video}"
VIDEO_FORMAT="${VIDEO_FORMAT:-mp4}"

echo "----------------------------------------"
echo "Recording URL -> $URL"
echo "----------------------------------------"

DISPLAY_NUM=99
DONE="no"

while [ "$DONE" == "no" ]
do
   out=$(xdpyinfo -display :$DISPLAY_NUM 2>&1)
   if [[ "$out" == name* ]] || [[ "$out" == Invalid* ]]
   then
      # command succeeded; or failed with access error;  display exists
      (( DISPLAY_NUM+=1 ))
   else
      # display doesn't exist
      DONE="yes"
   fi
done

echo "First available display -> :$DISPLAY_NUM"
echo "----------------------------------------"

su myuser -c "pulseaudio -D"
touch xvfb.log
chmod 777 xvfb.log

su myuser -c "xvfb-run --server-num=${DISPLAY_NUM} --server-args='-ac -screen 0 ${RESOLUTION}x24 -noreset' google-chrome -no-sandbox -disable-infobars -window-size=${ARRAY[0]},${ARRAY[1]} -start-fullscreen -no-first-run -ignore-certificate-errors $URL &> xvfb.log &"

sleep 3

touch stop
chmod 777 /recordings
su myuser -c "<./stop ffmpeg -y -video_size $RESOLUTION -framerate $FRAMERATE -f x11grab -i :${DISPLAY_NUM} -f pulse -ac 2 -i default /recordings/${VIDEO_NAME}.${VIDEO_FORMAT}"

