#!/bin/bash


CURRENT_UID="$(id -u $USER)"
if [[ $CURRENT_UID != $USER_ID ]]; then
  adduser --uid $USER_ID --disabled-password --gecos "" myuser
fi

URL="${URL:-https://www.youtube.com/watch?v=JMuzlEQz3uo}"
RESOLUTION="${RESOLUTION:-1920x1080}"
FRAMERATE="${FRAMERATE:-24}"
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
     # Command succeeded; or failed with access error;  display exists
     (( DISPLAY_NUM+=1 ))
  else
     # Display doesn't exist
     DONE="yes"
  fi
done

echo "First available display -> :$DISPLAY_NUM"
echo "----------------------------------------"

if [[ $CURRENT_UID != $USER_ID ]]; then
    su myuser -c "pulseaudio -D"
else
    pulseaudio -D
fi

touch xvfb.log
chmod 777 xvfb.log

if [[ $CURRENT_UID != $USER_ID ]]; then
    su myuser -c "xvfb-run --server-num=${DISPLAY_NUM} --server-args='-ac -screen 0 ${RESOLUTION}x24 -noreset' google-chrome -no-sandbox -disable-infobars -window-size=${ARRAY[0]},${ARRAY[1]} -no-first-run -ignore-certificate-errors --kiosk $URL &> xvfb.log &"
else
    xvfb-run --server-num=${DISPLAY_NUM} --server-args="-ac -screen 0 ${RESOLUTION}x24 -noreset" google-chrome -no-sandbox -disable-infobars -window-size=${ARRAY[0]},${ARRAY[1]} -no-first-run -ignore-certificate-errors --kiosk $URL &> xvfb.log &
fi

touch stop
chmod 777 /recordings

sleep 3

#su myuser -c "<./stop ffmpeg -y -video_size $RESOLUTION -framerate $FRAMERATE -f x11grab -i :${DISPLAY_NUM} -f pulse -ac 2 -i default /recordings/${VIDEO_NAME}.${VIDEO_FORMAT}"
#su myuser -c "<./stop ffmpeg -f alsa -ac 2 -i pulse -async 1 -f x11grab -i :${DISPLAY_NUM} -framerate $FRAMERATE -s $RESOLUTION -acodec copy -vcodec libx264 -preset medium -y /recordings/${VIDEO_NAME}.mkv"

#su myuser -c "<./stop ffmpeg -y -video_size $RESOLUTION -s $RESOLUTION -framerate $FRAMERATE -f x11grab -i :${DISPLAY_NUM} -f alsa -ac 2 -i pulse -async 1 -acodec copy -vcodec libx264 -preset medium -crf 0 -threads 0 -y /recordings/${VIDEO_NAME}.mkv"

#su myuser -c "<./stop ffmpeg -y -f alsa -i pulse -video_size $RESOLUTION -f x11grab -i :${DISPLAY_NUM} -r 24 -c:a libmp3lame -b:a 32k -c:v libx264 -b:v 500k /recordings/${VIDEO_NAME}.mkv"

if [[ $CURRENT_UID != $USER_ID ]]; then
    su myuser -c "<./stop ffmpeg -y -f alsa -i pulse -f x11grab -framerate 25 -video_size $RESOLUTION -i :${DISPLAY_NUM} -c:a libfdk_aac -c:v libx264 -preset ultrafast -crf 28 -refs 4 -qmin 4 -pix_fmt yuv420p -filter:v fps=25 '/recordings/${VIDEO_NAME}.mkv'"
else
    <./stop ffmpeg -y -f alsa -i pulse -f x11grab -framerate 25 -video_size $RESOLUTION -i :${DISPLAY_NUM} -c:a libfdk_aac -c:v libx264 -preset ultrafast -crf 28 -refs 4 -qmin 4 -pix_fmt yuv420p -filter:v fps=25 "/recordings/${VIDEO_NAME}.mkv"
fi

