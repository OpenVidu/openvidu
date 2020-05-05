#!/bin/bash

# Check if a txt is a valid ip
function valid_ip()
{
    local  ip=$1
    local  stat=1

    if [[ $ip =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        OIFS=$IFS
        IFS='.'
        ip=($ip)
        IFS=$OIFS
        [[ ${ip[0]} -le 255 && ${ip[1]} -le 255 \
            && ${ip[2]} -le 255 && ${ip[3]} -le 255 ]]
        stat=$?
    fi
    return $stat
}

# Services to get public ip
SERVICES=(
    "curl --silent -sw :%{http_code} ipv4.icanhazip.com"
    "curl --silent -sw :%{http_code} ifconfig.me"
    "curl --silent -sw :%{http_code} -4 ifconfig.co"
    "curl --silent -sw :%{http_code} ipecho.net/plain"
    "curl --silent -sw :%{http_code} ipinfo.io/ip"
    "curl --silent -sw :%{http_code} checkip.amazonaws.com"
    "curl --silent -sw :%{http_code} v4.ident.me"
)

# Get public ip
for service in "${SERVICES[@]}"; do
    RUN_COMMAND=$($service | tr -d '[:space:]')
    IP=$(echo "$RUN_COMMAND" | cut -d':' -f1)
    HTTP_CODE=$(echo "$RUN_COMMAND" | cut -d':' -f2)

    if [ "$HTTP_CODE" == "200" ]; then
        if valid_ip "$IP"; then 
            printf "%s" "$IP"
            exit 0
        fi
    fi
done

printf "error"
exit 0