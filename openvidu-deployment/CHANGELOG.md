# Changelog

Notable changes to the OpenVidu deployment templates for AWS, Azure and Google Cloud.

## Unreleased

### Automatic replacement of unhealthy Media Nodes

Elastic and High Availability deployments on AWS, Azure and Google Cloud now detect a
Media Node that stops working and replace it with a new one automatically, keeping the
same number of Media Nodes. Before, a broken Media Node stayed in the cluster until
someone noticed it and replaced it by hand.

#### How it works

Every Media Node runs a small health watchdog (the `openvidu-media-health` systemd
service). Every 30 seconds it checks that the node's media server answers its health
check, and it asks the cloud to replace the node when:

- **The media server is down** (it does not accept connections) for 5 minutes.
- **The media server is not responding properly** (errors or timeouts) for 10 minutes.
  This is not counted while the node's CPU is saturated, because an overloaded media
  server can briefly report itself as not ready.
- **The node's installation failed**. It waits 10 minutes first, so a failure can still be
  inspected and a persistent problem does not keep creating new nodes in a loop.
- **The node's installation has not finished** 90 minutes after it booted.

The replacement is done by each cloud's own mechanism:

| Cloud | What happens |
|---|---|
| AWS | The instance is marked unhealthy in its Auto Scaling Group, which drains it and launches a new one. |
| Google Cloud | The instance is recreated in its managed instance group with a fresh disk. The group's native autohealing (TCP check on port 7880) also covers a VM that stops responding altogether. |
| Azure | The instance is reimaged in its Virtual Machine Scale Set, so the number of instances never changes. |

#### Built-in safeguards

- **Master Node outages do not trigger replacements.** If no Master Node is reachable,
  every Media Node fails its health check at once and a new node could not join the
  cluster either. The watchdog waits, and once a Master Node is back it gives the media
  server its full time window to reconnect before acting.
- **Restarts are not mistaken for failures.** Failures are not counted during the first
  15 minutes after OpenVidu (re)starts on the node.
- **Graceful scale-in is preserved.** The watchdog pauses itself while a node is being
  drained during a normal scale-in.

#### Operating the watchdog

- See what it is doing: `journalctl -u openvidu-media-health` on the Media Node.
- Pause it, for example during manual maintenance on a node:
  `sudo touch /etc/openvidu/media-health.disabled`. Delete the file to resume.

#### High Availability Master Nodes

In High Availability deployments, the load balancer keeps checking the health of each
Master Node: if one stops responding it no longer receives traffic, and the other Master
Nodes keep serving.

### Fixed

- **RTMP ingress in High Availability deployments.** OpenVidu gives RTMP publishers an
  ingress URL on port 1945 (`rtmps://<your-domain>:1945/rtmp`), but the load balancer
  only accepted RTMP on port 1935, so publishing to that URL failed. The load balancer
  now accepts RTMPS on port 1945 on AWS, Azure and Google Cloud. If you publish RTMP to
  an HA deployment, use the URL OpenVidu returns when the ingress is created, and allow
  port 1945 in any firewall in front of your publishers.
