#!/bin/bash


### Variables ###

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
RECORDING_JSON="'${RECORDING_JSON}'"


### Store Recording json data ###

if [[ $CURRENT_UID != $USER_ID ]]; then
	su myuser -c "echo ${RECORDING_JSON} > /recordings/.recording.${VIDEO_NAME}"
else
	echo ${RECORDING_JSON} > /recordings/.recording.${VIDEO_NAME}
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

echo "First available display -> :$DISPLAY_NUM"
echo "----------------------------------------"


### Start pulseaudio ###

if [[ $CURRENT_UID != $USER_ID ]]; then
    su myuser -c "pulseaudio -D"
else
    pulseaudio -D
fi


### Start Chrome in headless mode with xvfb, using the display num previously obtained ###

touch xvfb.log
chmod 777 xvfb.log

if [[ $CURRENT_UID != $USER_ID ]]; then
    su myuser -c "xvfb-run --server-num=${DISPLAY_NUM} --server-args='-ac -screen 0 ${RESOLUTION}x24 -noreset' google-chrome -no-sandbox -test-type -disable-infobars -window-size=${ARRAY[0]},${ARRAY[1]} -no-first-run -ignore-certificate-errors --kiosk $URL &> xvfb.log &"
else
    xvfb-run --server-num=${DISPLAY_NUM} --server-args="-ac -screen 0 ${RESOLUTION}x24 -noreset" google-chrome -no-sandbox -test-type -disable-infobars -window-size=${ARRAY[0]},${ARRAY[1]} -no-first-run -ignore-certificate-errors --kiosk $URL &> xvfb.log &
fi

touch stop
chmod 777 /recordings

sleep 2


### Start recording with ffmpeg ###

if [[ $CURRENT_UID != $USER_ID ]]; then
	su myuser -c "<./stop ffmpeg -y -f alsa -i pulse -f x11grab -framerate 25 -video_size $RESOLUTION -i :${DISPLAY_NUM} -c:a libfdk_aac -c:v libx264 -preset ultrafast -crf 28 -refs 4 -qmin 4 -pix_fmt yuv420p -filter:v fps=25 '/recordings/${VIDEO_NAME}.${VIDEO_FORMAT}'"
else
	<./stop ffmpeg -y -f alsa -i pulse -f x11grab -framerate 25 -video_size $RESOLUTION -i :${DISPLAY_NUM} -c:a libfdk_aac -c:v libx264 -preset ultrafast -crf 28 -refs 4 -qmin 4 -pix_fmt yuv420p -filter:v fps=25 "/recordings/${VIDEO_NAME}.${VIDEO_FORMAT}"
fi


### Generate video report file ###

if [[ $CURRENT_UID != $USER_ID ]]; then
	su myuser -c "ffprobe -v quiet -print_format json -show_format -show_streams /recordings/${VIDEO_NAME}.${VIDEO_FORMAT} > /recordings/${VIDEO_NAME}.info"
else
	ffprobe -v quiet -print_format json -show_format -show_streams /recordings/${VIDEO_NAME}.${VIDEO_FORMAT} > /recordings/${VIDEO_NAME}.info
fi


### Update Recording json data ###

if [[ $CURRENT_UID != $USER_ID ]]; then

	TMP=$(su myuser -c "mktemp /recordings/.${VIDEO_NAME}.XXXXXXXXXXXXXXXXXXXXXXX.if.json")
	INFO=$(su myuser -c "cat /recordings/${VIDEO_NAME}.info | jq '.'")
	HAS_AUDIO_AUX=$(su myuser -c "echo '$INFO' | jq '.streams[] | select(.codec_type == \"audio\")'")
	if [ -z "$HAS_AUDIO_AUX" ]; then HAS_AUDIO=false; else HAS_AUDIO=true; fi
	HAS_VIDEO_AUX=$(su myuser -c "echo '$INFO' | jq '.streams[] | select(.codec_type == \"video\")'")
	if [ -z "$HAS_VIDEO_AUX" ]; then HAS_VIDEO=false; else HAS_VIDEO=true; fi
	SIZE=$(su myuser -c "echo '$INFO' | jq '.format.size | tonumber'")
	DURATION=$(su myuser -c "echo '$INFO' | jq '.format.duration | tonumber'")
	STATUS="stopped"

	# su myuser -c "echo 'TMP=${TMP}, SIZE=${SIZE}, DURATION=${DURATION}, STATUS=${STATUS}, HAS_AUDIO=${HAS_AUDIO}, HAS_VIDEO=${HAS_VIDEO}' > /recordings/.${VIDEO_NAME}.if.vars"

	su myuser -c "jq -c -r \".hasAudio=${HAS_AUDIO} | .hasVideo=${HAS_VIDEO} | .duration=${DURATION} | .size=${SIZE} | .status=\\\"${STATUS}\\\"\" \"/recordings/.recording.${VIDEO_NAME}\" > ${TMP} && mv ${TMP} \"/recordings/.recording.${VIDEO_NAME}\""

else

	TMP=$(mktemp /recordings/.${VIDEO_NAME}.XXXXXXXXXXXXXXXXXXXXXXX.if.json)
	INFO=$(cat /recordings/${VIDEO_NAME}.info | jq '.')
	HAS_AUDIO_AUX=$(echo "$INFO" | jq '.streams[] | select(.codec_type == "audio")')
	if [ -z "$HAS_AUDIO_AUX" ]; then HAS_AUDIO=false; else HAS_AUDIO=true; fi
	HAS_VIDEO_AUX=$(echo "$INFO" | jq '.streams[] | select(.codec_type == "video")')
	if [ -z "$HAS_VIDEO_AUX" ]; then HAS_VIDEO=false; else HAS_VIDEO=true; fi
	SIZE=$(echo "$INFO" | jq '.format.size | tonumber')
	DURATION=$(echo "$INFO" | jq '.format.duration | tonumber')
	STATUS="stopped"

	# echo "TMP=${TMP}, SIZE=${SIZE}, DURATION=${DURATION}, STATUS=${STATUS}, HAS_AUDIO=${HAS_AUDIO}, HAS_VIDEO=${HAS_VIDEO}" > /recordings/.${VIDEO_NAME}.if.vars

	jq -c -r ".hasAudio=${HAS_AUDIO} | .hasVideo=${HAS_VIDEO} | .duration=${DURATION} | .size=${SIZE} | .status=\"${STATUS}\"" "/recordings/.recording.${VIDEO_NAME}" > ${TMP} && mv ${TMP} "/recordings/.recording.${VIDEO_NAME}"

fi

