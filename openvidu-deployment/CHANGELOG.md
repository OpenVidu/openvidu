# Changelog

Every release groups its `Added`, `Improved` and `Fixed` entries by the cloud they apply to:

- **All clouds**: changes that behave the same on every cloud.
- **AWS**, **Azure**, **Google Cloud**, **Oracle Cloud** and **DigitalOcean**: what is specific to that
  cloud's templates.

The AWS, Azure and Google Cloud templates live in this folder. The Oracle Cloud and DigitalOcean templates live
in the [openvidu-oracle](https://github.com/OpenVidu/openvidu-oracle) and
[openvidu-digitalocean](https://github.com/OpenVidu/openvidu-digitalocean) repositories.

## 3.10.0 (unreleased)

### Added

#### All clouds

- Elastic and High Availability deployments replace an unhealthy Media Node with a new one automatically,
  keeping the same number of Media Nodes. Before, a broken Media Node stayed in the cluster until it was
  replaced by hand. Every Media Node runs a health watchdog (the `openvidu-media-health` systemd service)
  that checks its media server every 30 seconds and asks the cloud to replace the node when:
  - the media server does not accept connections for 5 minutes,
  - the media server answers with errors or timeouts for 10 minutes (not counted while the node's CPU is
    saturated, because an overloaded media server briefly reports itself as not ready),
  - the node's installation failed (after a 10 minute wait, so the failure can be inspected and a persistent
    problem does not create new nodes in a loop),
  - or the node's installation has not finished 90 minutes after it booted.
- Safeguards of the Media Node watchdog:
  - No Media Node is replaced while no Master Node is reachable: a Master Node outage makes every Media Node
    fail its health check at once, and a new node could not join the cluster either. Once a Master Node is
    back, the media server gets its full time window to reconnect before the watchdog acts.
  - Failures are not counted during the first 15 minutes after OpenVidu (re)starts on the node.
  - The watchdog pauses itself while a node is drained during a normal scale-in.
  - `journalctl -u openvidu-media-health` on a Media Node shows what it is doing, and
    `sudo touch /etc/openvidu/media-health.disabled` pauses it (for example during manual maintenance);
    deleting the file resumes it.

#### AWS

- An unhealthy Media Node is marked unhealthy in its Auto Scaling Group, which drains it and launches a new
  one.

#### Azure

- An unhealthy Media Node is reimaged in its Virtual Machine Scale Set, so the number of instances never
  changes.

#### Google Cloud

- An unhealthy Media Node is recreated in its managed instance group with a fresh disk. The group's native
  autohealing (TCP health check on port 7880), now also enabled in High Availability deployments, covers a
  Media Node VM that stops responding altogether.

#### Oracle Cloud

- An unhealthy Media Node is terminated and its instance pool launches a new one. With a fixed number of
  Media Nodes, the node is detached from the pool, which launches its replacement, and then terminated.

#### DigitalOcean

- With autoscaling, an unhealthy Media Node is tagged so the autoscaler deletes it and creates a new one. With
  a fixed number of Media Nodes, the Droplet is rebuilt in place.

### Fixed

#### All clouds

- High Availability: publishing to an RTMP ingress failed. OpenVidu returns the ingress URL on port 1945
  (`rtmps://<your-domain>:1945/rtmp`), but the load balancer only accepted RTMP on port 1935. The load
  balancer now accepts RTMPS on port 1945. Publish to the URL OpenVidu returns when the ingress is created, and
  allow port 1945 in any firewall in front of your publishers.

#### AWS

- Single node and Elastic: the Elastic IP was attached only after the instance had started booting, so the
  domain could be derived from a temporary public IP, or the instance could start without Internet access and
  fail its installation. The Elastic IP is now known in advance, and the instance waits up to 10 minutes for
  it before installing anything.
