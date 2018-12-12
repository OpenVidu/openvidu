#!/bin/bash


### Variables ###

CURRENT_UID="$(id -u $USER)"
if [[ $CURRENT_UID != $USER_ID ]]; then
  adduser --uid $USER_ID --disabled-password --gecos "" myuser
fi

URL=${URL:-https://www.youtube.com/watch?v=JMuzlEQz3uo}
RESOLUTION=${RESOLUTION:-1920x1080}
FRAMERATE=${FRAMERATE:-24}
WIDTH="$(cut -d'x' -f1 <<< $RESOLUTION)"
HEIGHT="$(cut -d'x' -f2 <<< $RESOLUTION)"
VIDEO_ID=${VIDEO_ID:-video}
VIDEO_NAME=${VIDEO_NAME:-video}
VIDEO_FORMAT=${VIDEO_FORMAT:-mp4}
RECORDING_JSON="${RECORDING_JSON}"

export URL
export RESOLUTION
export FRAMERATE
export WIDTH
export HEIGHT
export VIDEO_ID
export VIDEO_NAME
export VIDEO_FORMAT
export RECORDING_JSON

### Store Recording json data ###

function1() {
	echo $RECORDING_JSON > /recordings/.recording.$VIDEO_ID
}
export -f function1
if [[ $CURRENT_UID != $USER_ID ]]; then
	su myuser -c "bash -c function1"
else
	function1
fi

### Get a free display identificator ###

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

export DISPLAY_NUM

echo "First available display -> :$DISPLAY_NUM"
echo "----------------------------------------"


### Start pulseaudio ###

function2() {
	pulseaudio -D
}
export -f function2
if [[ $CURRENT_UID != $USER_ID ]]; then
    su myuser -c "bash -c function2"
else
    function2
fi


### Start Chrome in headless mode with xvfb, using the display num previously obtained ###

touch xvfb.log
chmod 777 xvfb.log

function3() {
	xvfb-run --server-num=${DISPLAY_NUM} --server-args="-ac -screen 0 ${RESOLUTION}x24 -noreset" google-chrome -start-maximized -no-sandbox -test-type -disable-infobars -window-size=$WIDTH,$HEIGHT -no-first-run -ignore-certificate-errors --autoplay-policy=no-user-gesture-required --kiosk $URL &> xvfb.log &
}
export -f function3
if [[ $CURRENT_UID != $USER_ID ]]; then
    su myuser -c "bash -c function3"
else
    function3
fi

touch stop
chmod 777 /recordings

sleep 2


### Start recording with ffmpeg ###

function4() {
    <./stop ffmpeg -y -f alsa -i pulse -f x11grab -draw_mouse 0 -framerate 25 -video_size $RESOLUTION -i :$DISPLAY_NUM -c:a aac -c:v libx264 -preset ultrafast -crf 28 -refs 4 -qmin 4 -pix_fmt yuv420p -filter:v fps=25 "/recordings/$VIDEO_NAME.$VIDEO_FORMAT"
}
export -f function4
if [[ $CURRENT_UID != $USER_ID ]]; then
	su myuser -c "bash -c function4"
else
    function4
fi


### Generate video report file ###

function5() {
    ffprobe -v quiet -print_format json -show_format -show_streams /recordings/$VIDEO_NAME.$VIDEO_FORMAT > /recordings/$VIDEO_ID.info
}
export -f function5
if [[ $CURRENT_UID != $USER_ID ]]; then
	su myuser -c "bash -c function5"
else
	function5
fi


### Update Recording json data ###

function6() {
    TMP=$(mktemp /recordings/.$VIDEO_ID.XXXXXXXXXXXXXXXXXXXXXXX.json)
	INFO=$(cat /recordings/$VIDEO_ID.info | jq '.')
	HAS_AUDIO_AUX=$(echo $INFO | jq '.streams[] | select(.codec_type == "audio")')
	if [ -z "$HAS_AUDIO_AUX" ]; then HAS_AUDIO=false; else HAS_AUDIO=true; fi
	HAS_VIDEO_AUX=$(echo $INFO | jq '.streams[] | select(.codec_type == "video")')
	if [ -z "$HAS_VIDEO_AUX" ]; then HAS_VIDEO=false; else HAS_VIDEO=true; fi
	SIZE=$(echo $INFO | jq '.format.size | tonumber')
	DURATION=$(echo $INFO | jq '.format.duration | tonumber')
	STATUS="stopped"
	jq -c -r ".hasAudio=$HAS_AUDIO | .hasVideo=$HAS_VIDEO | .duration=$DURATION | .size=$SIZE | .status=\"$STATUS\"" "/recordings/.recording.$VIDEO_ID" > $TMP && mv $TMP /recordings/.recording.$VIDEO_ID
}
export -f function6
if [[ $CURRENT_UID != $USER_ID ]]; then
	su myuser -c "bash -c function6"
else
	function6
fi


### Generate video thumbnail ###

function7() {
	MIDDLE_TIME=$(ffmpeg -i /recordings/$VIDEO_NAME.$VIDEO_FORMAT 2>&1 | grep Duration | awk '{print $2}' | tr -d , | awk -F ':' '{print ($3+$2*60+$1*3600)/2}')
	ffmpeg -ss $MIDDLE_TIME -i /recordings/$VIDEO_NAME.$VIDEO_FORMAT -vframes 1 -s 480x300 /recordings/$VIDEO_ID.jpg
}
export -f function7
if [[ $CURRENT_UID != $USER_ID ]]; then
	su myuser -c "bash -c function7"
else
	function7
fi
