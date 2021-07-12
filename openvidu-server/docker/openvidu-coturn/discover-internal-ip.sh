#!/usr/bin/env sh
# shellcheck shell=dash

#/ Use the routing table to find the default internal IP for outgoing packets.
#/
#/ This script is useful when running from a machine that sits behind a NAT.
#/ Due to how NAT works, machines behind it belong to an internal or private
#/ subnet, with a different address space than the external or public side.
#/
#/ Any given machine might have multiple network interfaces, but the most
#/ common scenario is that only one is actually used for communications with the
#/ outside world, handling traffic that comes from the external NAT side.
#/
#/ This script queries the system's IP routing tables for a dummy external IP,
#/ which has the effect of providing us with the IP of the network interface
#/ that would have been used for communicating with that address.
#/
#/ Arguments
#/ ---------
#/
#/ --default
#/
#/   Find the internal IP address of the default IP route gateway.
#/   Optional. Default: Enabled.
#/
#/ --name <InterfaceName>
#/
#/   Find the internal IP address of the specified IP route gateway.
#/   Optional. Default: Disabled.



# Shell setup
# ===========

# Shell options for strict error checking.
for OPTION in errexit errtrace pipefail nounset; do
    set -o | grep -wq "$OPTION" && set -o "$OPTION"
done

# Trace all commands (to stderr).
#set -o xtrace



# Parse arguments
# ===============

CFG_DEFAULT="true"
CFG_NAME=""

while [ $# -gt 0 ]; do
    case "${1-}" in
        --default)
            CFG_DEFAULT="true"
            ;;
        --name)
            if [ -n "${2-}" ]; then
                CFG_NAME="$2"
                shift
            else
                echo "[$0] ERROR: --name expects <InterfaceName>" >&2
                exit 1
            fi
            ;;
        *)
            echo "[$0] Invalid argument: '${1-}'" >&2
            exit 1
            ;;
    esac
    shift
done

# Ensure coherent settings...

if [ -n "$CFG_NAME" ]; then
    CFG_DEFAULT="false"
fi



# Discover internal IP address
# ============================

if [ "$CFG_DEFAULT" = "true" ]; then
    # Get main local IP address from the default external route (Internet gateway).
    # Uses "1.0.0.0" as the target address, but any other external IP would work.
    COMMAND='ip -4 -oneline route get 1.0.0.0 | grep -Po "src \K(\d\.?)+"'
else
    COMMAND="ip -4 -oneline address show dev '$CFG_NAME' | grep -Po 'inet \K(\d\.?)+'"
fi

is_valid_ip() {
    # Check if the input looks like an IPv4 address.
    # Doesn't check if the actual values are valid; assumes they are.
    echo "$1" | grep -Eq '^([0-9]{1,3}\.){3}[0-9]{1,3}$'
}

if IP="$(eval "$COMMAND")" && is_valid_ip "$IP"; then
    printf '%s' "$IP"
    exit 0
fi

echo "[$0] Discovery failed" >&2
exit 1
