#!/bin/bash

docker run -d --name chrome-iptables -p 4444:4444 -p 6080:6080 -p 5900:5900 --cap-add=SYS_ADMIN --cap-add=NET_ADMIN elastestbrowsers/chrome:latest

sleep 3

docker exec -i chrome-iptables bash <<'EOF'

sudo apt-get -y update && sudo apt-get -y install iptables && sudo apt-get -y install terminator && sudo apt-get -y install lsof

# UDP rules (DROP all)

sudo iptables -A OUTPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 4444 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 6080 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 5900 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 4200 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 4443 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 3478 -j ACCEPT

sudo iptables -A OUTPUT -p tcp --sport 80 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --sport 443 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --sport 4444 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --sport 6080 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --sport 5900 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --sport 4200 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --sport 4443 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --sport 3478 -j ACCEPT

sudo iptables -A OUTPUT -p tcp --sport 53 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT
sudo iptables -A OUTPUT -p udp --sport 53 -j ACCEPT
sudo iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
sudo iptables -A INPUT -p tcp --sport 53 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 53 -j ACCEPT
sudo iptables -A INPUT -p udp --sport 53 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 53 -j ACCEPT

sudo iptables -A OUTPUT -p tcp -j DROP

sudo iptables -A OUTPUT -p udp --dport 0:65535 -j DROP
sudo iptables -A INPUT -p udp --dport 0:65535 -j DROP

exit
EOF



# sudo iptables -L --line-numbers
# sudo iptables -D INPUT 1
# sudo iptables -D OUTPUT 1

# turnadmin -l -N "ip=127.0.0.1 dbname=0 password=turn connect_timeout=30"
# turnadmin -a -u USER -r openvidu -p PASS -N "ip=127.0.0.1 dbname=0 password=turn connect_timeout=30"
# turnadmin -d -u USER -r openvidu -N "ip=127.0.0.1 dbname=0 password=turn connect_timeout=30"


# google-chrome -start-maximized -disable-infobars -no-first-run -ignore-certificate-errors -use-fake-device-for-media-stream -use-fake-ui-for-media-stream

