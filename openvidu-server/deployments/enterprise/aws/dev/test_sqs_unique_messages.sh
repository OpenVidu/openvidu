#!/bin/bash
fatal_error() {
    printf "\n     =======¡ERROR!======="
    printf "\n     %s" "$1"
    printf "\n"
    exit 1
}

QUEUE_URL=$1
[[ -n ${QUEUE_URL} ]] || fatal_error "No queue url specified. You need to specify a SQS queue URL as first parameter"
while true; do
    TIMESTAMP=$(date +%s)
    aws sqs send-message \
        --queue-url "${QUEUE_URL}" \
        --message-body "{\"source\":\"custom.test\",\"id\":\"$TIMESTAMP\"}" \
        --message-group-id "test"
    sleep 0.5
done
