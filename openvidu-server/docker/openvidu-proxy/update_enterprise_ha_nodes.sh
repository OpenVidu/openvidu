#!/bin/bash

# Check if PROXY_MODE is ENTERPRISE_HA
if [[ "${PROXY_MODE}" != "ENTERPRISE_HA" ]]; then
    echo "PROXY_MODE is not ENTERPRISE_HA"
    exit 1
fi

if [[ -z "${OPENVIDU_ENTERPRISE_HA_NODE_IPS}" ]]; then
    echo "OPENVIDU_ENTERPRISE_HA_NODE_IPS is not set."
    exit 1
else
    echo "Updating OPENVIDU_ENTERPRISE_HA_NODE_IPS in load balancer"
    echo "OPENVIDU_ENTERPRISE_HA_NODE_IPS: ${OPENVIDU_ENTERPRISE_HA_NODE_IPS}"
    IFS=',' read -ra IP_ARRAY <<< "$OPENVIDU_ENTERPRISE_HA_NODE_IPS"
    NEW_UPSTREAM=""
    for i in "${IP_ARRAY[@]}"; do
        NEW_UPSTREAM+="    server ${i}:4443 max_fails=2 fail_timeout=3s;\n"
    done
    unset IFS
    sed -i "/upstream openviduserver {/,/}/c\upstream openviduserver {\n$NEW_UPSTREAM}" /etc/nginx/conf.d/*
    echo "Updated OPENVIDU_ENTERPRISE_HA_NODE_IPS in load balancer"
    echo "Reloading nginx"
    nginx -s reload
    echo "Nginx updated successfully"
fi