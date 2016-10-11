#!/bin/bash

# ${project.description} installer for Ubuntu >= 14.04
if [ `id -u` -ne 0 ]; then
    echo ""
    echo "Only root can install Kurento"
    echo ""
    exit 1
fi

echo "Installing kurento-room-sfu-demo"

APP_HOME=$(dirname $(dirname $(readlink -f $0)))
APP_NAME=${project.artifactId}

useradd -d /var/kurento/ kurento

SYSTEMD=$(pidof systemd && echo "systemd" || echo "other")

# Install binaries
mkdir -p /var/lib/kurento
chown kurento /var/lib/kurento
install -o kurento -g root $APP_HOME/lib/$APP_NAME.jar /var/lib/kurento/
install -o kurento -g root $APP_HOME/config/$APP_NAME.conf /var/lib/kurento/
install -o kurento -g root $APP_HOME/config/$APP_NAME.properties /var/lib/kurento/
install -o kurento -g root $APP_HOME/support-files/keystore.jks /var/lib/kurento/
ln -s /var/lib/kurento/$APP_NAME.jar /etc/init.d/$APP_NAME
chmod 755 /etc/init.d/$APP_NAME

mkdir -p /etc/kurento/
install -o kurento -g root $APP_HOME/config/app.conf.json /etc/kurento/$APP_NAME.conf.json
install -o kurento -g root $APP_HOME/support-files/log4j.properties /etc/kurento/$APP_NAME-log4j.properties

mkdir -p /var/log/kurento
chown kurento /var/log/kurento


if [[ "$SYSTEMD" != "other" ]]; then
	install -o root -g root $APP_HOME/support-files/systemd.service /etc/systemd/system/$APP_NAME.service
	sudo systemctl daemon-reload
	# enable at startup
	[ -z "$NOENABLE" ] && systemctl enable $APP_NAME || echo "App not enabled"
	# start service
	[ -z "$NOSTART" ] && systemctl start $APP_NAME || echo "App not started"
else
  # enable at startup
	[ -z "$NOENABLE" ] && update-rc.d $APP_NAME defaults || echo "App not enabled"
  # start service
  [ -z "$NOSTART" ] && service $APP_NAME start || echo "App not started"
fi
