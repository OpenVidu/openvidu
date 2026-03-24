#!/usr/bin/env sh
# shellcheck shell=dash

#/ Return the IP address of 'host.docker.internal'.
#/
#/ Docker injects 'host.docker.internal' into /etc/hosts when the container
#/ is started with --add-host=host.docker.internal:host-gateway, which maps
#/ it to the host machine's gateway IP as seen from inside the container.



# Shell setup
# ===========

# Shell options for strict error checking.
for OPTION in errexit errtrace pipefail nounset; do
    set -o | grep -wq "$OPTION" && set -o "$OPTION"
done

# Trace all commands (to stderr).
#set -o xtrace



# Discover host.docker.internal IP
# =================================

IP="$(grep -m1 -E '^[0-9][^#]*[[:space:]]host\.docker\.internal([[:space:]]|$)' /etc/hosts | awk '{print $1}')"

if [ -z "$IP" ]; then
    echo "[$0] 'host.docker.internal' not found in /etc/hosts" >&2
    echo "[$0] Make sure the container is started with --add-host=host.docker.internal:host-gateway" >&2
    exit 1
fi

echo "$IP"
