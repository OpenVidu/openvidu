#!/bin/bash

echo
echo "================ Running headless Chrome ==============="

# Cleanup to be "stateless" on startup, otherwise pulseaudio daemon can't start
rm -rf /var/run/pulse /var/lib/pulse /root/.config/pulse
# Run pulseaudio
pulseaudio -D --system --disallow-exit --disallow-module-loading

### Start Chrome in headless mode with xvfb, using the display num previously obtained ###

touch xvfb.log
chmod 777 xvfb.log

xvfb-run-safe --server-args="-ac -screen 0 ${RESOLUTION}x24 -noreset" google-chrome \
    --kiosk \
    --start-maximized \
    --test-type \
    --no-sandbox \
    --disable-infobars \
    --disable-gpu \
    --disable-popup-blocking \
    --window-size=$WIDTH,$HEIGHT \
    --window-position=0,0 \
    --no-first-run \
    --disable-features=Translate \
    --ignore-certificate-errors \
    --disable-dev-shm-usage \
    --autoplay-policy=no-user-gesture-required \
    --simulate-outdated-no-au='Tue, 31 Dec 2099 23:59:59 GMT' \
    --disable-sync \
    --no-default-browser-check \
    --disable-component-update \
    --disable-background-networking \
    --disable-default-apps \
    --flag-switches-begin --disable-features=WebRtcHideLocalIpsWithMdns --flag-switches-end \
    $DEBUG_CHROME_FLAGS $URL &>xvfb.log &

until pids=$(pidof Xvfb); do
    sleep 0.1
    echo "Waiting for Xvfb to start..."
done

touch stop

### Calculate the display num in use parsing args of command "Xvfb"

export XVFB_ARGS=$(ps -eo args | grep [X]vfb)
export DISPLAY_NUM=$(echo $XVFB_ARGS | sed 's/Xvfb :\([0-9]\+\).*/\1/')
echo "Display in use -> :$DISPLAY_NUM"
echo "========================================================"
echo
