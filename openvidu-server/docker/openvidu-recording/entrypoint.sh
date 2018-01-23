#!/bin/bash

URL="${URL:-https://www.youtube.com/watch?v=JMuzlEQz3uo}"
RESOLUTION="${RESOLUTION:-1920x1080}"
FRAMERATE="${FRAMERATE:-30}"
VIDEO_SIZE="$RESOLUTION"
ARRAY=(${VIDEO_SIZE//x/ })
VIDEO_NAME="${VIDEO_NAME:-video}"
VIDEO_FORMAT="${VIDEO_FORMAT:-avi}"

pulseaudio -D
xvfb-run -s "-ac -screen 0 ${RESOLUTION}x16" google-chrome -no-sandbox -disable-infobars -window-size=${ARRAY[0]},${ARRAY[1]} -start-fullscreen -no-first-run $URL &> xvfb.log &

sleep 4

touch stop
<./stop ffmpeg -y -video_size $RESOLUTION -framerate $FRAMERATE -f x11grab -i :99 -f pulse -ac 2 -i default -strict -2 /recordings/${VIDEO_NAME}.${VIDEO_FORMAT}



# TO START THE CONTAINER
# docker run --name=recording openvidu/openvidu-recording

# TO STOP THE RECORDING
# docker exec recording bash -c "echo 'q' > stop"

# TO GET THE VIDEO FILE
# docker cp recording:recordings/video.mp4 ./video.mp4
