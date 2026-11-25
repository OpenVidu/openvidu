# Changelog

Changes to the cloud templates: AWS, Azure and Google Cloud in this folder, Oracle Cloud in
[openvidu-oracle](https://github.com/OpenVidu/openvidu-oracle) and DigitalOcean in
[openvidu-digitalocean](https://github.com/OpenVidu/openvidu-digitalocean). An entry that names no cloud or
deployment type applies to all of them. `Internal` lists the changes a deployment does not notice.

## 3.10.0 (unreleased)

### Upgrade notes

- When updating an existing deployment, keep its Master Node disk size where it is a parameter
  (`MasterNodesDiskSize` on AWS High Availability, `masterNodesDiskSize` on Azure and Google Cloud High
  Availability, `masterNodeDiskSize` on Oracle Cloud Elastic and High Availability): the default is now 200 GB,
  and a Master Node whose disk size changes is recreated.
- Google Cloud Elastic and High Availability: the first update replaces the Media Nodes once, to move them to the
  `ubuntu-2404-lts` image family.
- DigitalOcean Elastic and High Availability with more than one fixed Media Node: the first update replaces them
  once.
- High Availability RTMP ingress is published on port 1945 (`rtmps://<your-domain>:1945/rtmp`, the URL OpenVidu
  returns): allow that port in any firewall in front of the publishers.

### Deprecated

- `RTCEngine` (Google Cloud and Oracle Cloud single node) and `masterNodesInstanceType` (Google Cloud and
  DigitalOcean High Availability) are now `rtcEngine` and `masterNodeInstanceType`, as on the other templates. The
  old names still work, and win when set.

### Added

- Elastic and High Availability replace an unhealthy Media Node automatically. A watchdog on each Media Node
  (`openvidu-media-health`) asks the cloud for a new node when the media server refuses connections for 5 minutes,
  fails its health check for 10 minutes (not while the CPU is saturated), or the node's installation failed or has
  not finished 90 minutes after boot. It waits while no Master Node answers, for 15 minutes after OpenVidu starts,
  and while the node drains in a scale-in. `journalctl -u openvidu-media-health` shows what it does;
  `sudo touch /etc/openvidu/media-health.disabled` pauses it.
  - AWS marks the node unhealthy in its Auto Scaling Group, Azure reimages it in its scale set, Google Cloud
    recreates it in its instance group, Oracle Cloud terminates it and the pool launches another, and DigitalOcean
    replaces it through the autoscaler, or rebuilds the Droplet with a fixed number of Media Nodes.
  - Google Cloud High Availability also enables the instance group's autohealing, which replaces a Media Node VM
    that stops responding.
- AWS, Azure and Google Cloud Elastic and High Availability can run a fixed number of Media Nodes without
  autoscaling, as Oracle Cloud and DigitalOcean already could: `FixedNumberOfMediaNodes` on AWS,
  `fixedNumberOfMediaNodes` on the others (0, the default, keeps autoscaling). Changing it is a redeploy. Lowering it
  drains the removed nodes gracefully on AWS and Google Cloud; Azure does not accept a number below the Media Nodes
  running, which have to be drained first (see the administration documentation).
- AWS High Availability: TURN over UDP for Media Nodes in private subnets, through a second Network Load Balancer
  on UDP 443, when `TurnDomainName`, `TurnCertificateARN` and `LoadBalancerSubnets` are set. New output
  `TurnUDPLoadBalancerDNS`.

### Improved

- The single node and the Master Nodes get a 200 GB disk by default where the template sets its size (it was
  100 GB on Azure, Google Cloud and the AWS High Availability Master Nodes, and about 47 GB on the Oracle Cloud single
  node).
- Google Cloud boots the latest Ubuntu 24.04 (`ubuntu-2404-lts` image family) instead of an image from December
  2024.
- Oracle Cloud single node: 2 OCPUs and 8 GB of memory by default, instead of 4 OCPUs and 4 GB.

### Fixed

- High Availability: RTMP ingress failed, because the load balancer accepted RTMP only on port 1935 while OpenVidu
  returns the URL on port 1945.
- AWS single node and Elastic: the instance could take its domain from a temporary IP, or fail its installation
  without Internet access, because the Elastic IP was attached late. It now waits up to 10 minutes for it.
- AWS High Availability: a stack whose Master Nodes failed to install still ended in `CREATE_COMPLETE`. It now
  completes only when OpenVidu is installed and healthy.
- Azure Elastic and High Availability: redeploying the template always failed (`InUseSubnetCannotBeDeleted`,
  `'Service Uri' must not be empty`), so no parameter could be changed after the first deployment.
- Azure: the WebRTC over TCP rule opened ports 50000 and 60000 instead of the range between them.
- Azure single node and Elastic: port 9000 (MinIO, which Azure deployments do not run) was open to the Internet.
- Google Cloud single node: `rtcEngine`, the documented name, was ignored.
- DigitalOcean Elastic and High Availability:
  - The v2 compatibility module was not enabled by default, unlike on every other cloud.
  - Changing `fixedNumberOfMediaNodes` replaced every fixed Media Node and cut their Rooms. Now it only adds or
    removes the extra ones.
  - Right after a scale-out, the autoscaler could drain the old Media Node, the one hosting the Rooms, because the
    new one had no CPU data yet. It now waits up to 15 minutes for that data, and never scales in on CPU without
    it.
  - The deployment could fail because the VPC range derived from the stack name fell in a range DigitalOcean
    reserves. It is now derived inside 10.64.0.0 to 10.99.255.255; existing deployments keep theirs.

### Internal

- The templates download the install scripts over HTTPS (`https://get.openvidu.io`).
- The install scripts use `openvidu/mongodb:8.0.34-compat-r0` instead of the official MongoDB image, with the same
  data layout, and accept `LIVEKIT_EGRESS_SERVER_PRO_IMAGE` to override the PRO egress image.
- Third-party image versions updated.
- Azure: compiled templates rebuilt with Bicep 0.46.1.
- Oracle Cloud: the scale-in function image gets the Oracle Linux updates, no pip at runtime and a single layer
  (363 MB to 321 MB).
- The Media Nodes install with the same arguments on every cloud.
- AWS High Availability: the RTMP target group has a new name, so a stack update can replace it.
