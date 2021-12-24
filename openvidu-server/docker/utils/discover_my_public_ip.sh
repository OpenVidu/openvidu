#!/usr/bin/env bash

#/ Discover the external IP address of the running system.
#/
#/ This script is useful when running from a machine that sits behind a NAT.
#/ Due to how NAT works, machines behind it belong to an internal or private
#/ subnet, with a different address space than the external or public side.
#/
#/ Typically it is possible to make an HTTP request to a number of providers
#/ that offer the external IP in their response body (eg: ifconfig.me). However,
#/ why do a slow and heavy HTTP request, when DNS exists and is much faster?
#/ Well established providers such as OpenDNS or Google offer special hostnames
#/ that, when resolved, will actually return the IP address of the caller.
#/
#/ https://unix.stackexchange.com/questions/22615/how-can-i-get-my-external-ip-address-in-a-shell-script/81699#81699
#/
#/
#/ Arguments
#/ =========
#/
#/ --ipv4
#/
#/   Find the external IPv4 address.
#/   Optional. Default: Enabled.
#/
#/ --ipv6
#/
#/   Find the external IPv6 address.
#/   Optional. Default: Disabled.



# Shell setup
# ===========

# Bash options for strict error checking.
set -o errexit -o errtrace -o pipefail -o nounset

# Trace all commands (to stderr).
#set -o xtrace

# Trap function for unhandled errors.
function on_error {
    echo "[$0] ERROR ($?)" >&2
    exit 1
}
trap on_error ERR

# Check dependencies.
function check_programs {
    local PROGRAMS=(
        dig
        wget
    )
    for PROGRAM in "${PROGRAMS[@]}"; do
        command -v "$PROGRAM" >/dev/null || {
            echo "[$0] ERROR: '$PROGRAM' is not installed; please install it"
            exit 1
        }
    done
}
check_programs



# Parse arguments
# ===============

CFG_IPV4="true"
CFG_IPV6="false"

while [[ $# -gt 0 ]]; do
    case "${1-}" in
        --ipv4)
            CFG_IPV4="true"
            CFG_IPV6="false"
            ;;
        --ipv6)
            CFG_IPV4="false"
            CFG_IPV6="true"
            ;;
        *)
            echo "[$0] Invalid argument: '${1-}'" >&2
            exit 1
            ;;
    esac
    shift
done



# Discover external IP address
# ============================

if [[ "$CFG_IPV4" == "true" ]]; then
    COMMANDS=(
        'dig @resolver1.opendns.com myip.opendns.com A -4 +short'
        'dig @ns1.google.com o-o.myaddr.l.google.com TXT -4 +short | tr -d \"'
        'dig @1.1.1.1 whoami.cloudflare TXT CH -4 +short | tr -d \"'
        'dig @ns1-1.akamaitech.net whoami.akamai.net A -4 +short'
        'wget --quiet -4 -O - ifconfig.co'
    )

    function is_valid_ip {
        # Check if the input looks like an IPv4 address.
        # Doesn't check if the actual values are valid; assumes they are.
        echo "$1" | grep --perl-regexp --quiet '^(\d{1,3}\.){3}\d{1,3}$'
    }
elif [[ "$CFG_IPV6" == "true" ]]; then
    COMMANDS=(
        'dig @resolver1.opendns.com myip.opendns.com AAAA -6 +short'
        'dig @ns1.google.com o-o.myaddr.l.google.com TXT -6 +short | tr -d \"'
        'dig @2606:4700:4700::1111 whoami.cloudflare TXT CH -6 +short | tr -d \"'
        'wget --quiet -6 -O - ifconfig.co'
    )

    function is_valid_ip {
        # Check if the input looks like an IPv6 address.
        # It's almost impossible to check the IPv6 representation because it
        # varies wildly, so just check that there are at least 2 colons.
        [[ "$(echo "$1" | awk -F':' '{print NF-1}')" -ge 2 ]]
    }
fi

for COMMAND in "${COMMANDS[@]}"; do
    if IP="$(eval "$COMMAND")" && is_valid_ip "$IP"; then
        echo "$IP"
        exit 0
    fi
done

echo "[$0] Discovery failed" >&2
exit 1
