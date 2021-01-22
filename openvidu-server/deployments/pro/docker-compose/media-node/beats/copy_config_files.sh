#!/bin/sh
echo "Creating dir for beats"
mkdir -p /opt/openvidu/beats
echo "Copying beat config files"
cp /beats/filebeat.yml /opt/openvidu/beats/filebeat.yml
cp /beats/metricbeat-elasticsearch.yml /opt/openvidu/beats/metricbeat-elasticsearch.yml