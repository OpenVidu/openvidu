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
- Elastic and High Availability deployments on AWS, Azure and Google Cloud can run a fixed number of Media
  Nodes, as DigitalOcean and Oracle Cloud already could, with the same parameter: `FixedNumberOfMediaNodes`
  on AWS, `fixedNumberOfMediaNodes` on the other clouds. With a value greater than 0 the deployment runs
  exactly that many Media Nodes with no autoscaling, and the initial, minimum, maximum and target CPU
  parameters are ignored. The default, 0, keeps autoscaling. An unhealthy Media Node is still replaced.
  Changing the number, or switching between the two modes, is a redeploy of the template with the new value.
  Raising the number adds Media Nodes. On AWS and Google Cloud, lowering it drains the Media Nodes it removes
  gracefully, as in a scale-in: each one stops accepting new Rooms and is removed when its ongoing Rooms,
  recordings and ingests end. Azure does not accept a number below the Media Nodes running, because they
  protect themselves from scale-in: drain the extra ones first (manual scale, then
  `/usr/local/bin/stop_media_node.sh` on each, which removes itself the same graceful way) and then redeploy.
  The administration documentation of each cloud describes the steps.

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

### Improved

#### All clouds

- The single node and the Master Nodes get a 200 GB disk by default on every cloud where the template sets
  its size. Azure and Google Cloud raise it from 100 GB (single node, Elastic Master Node and High
  Availability Master Nodes), as do the High Availability Master Nodes on AWS and the Elastic and High
  Availability Master Nodes on Oracle Cloud. Oracle Cloud single node, which used the size of the image
  (about 47 GB), now sets 200 GB. AWS single node and Elastic Master Node already had 200 GB, and on
  DigitalOcean the disk comes with the Droplet size. On Google Cloud and Oracle Cloud single node and the
  Google Cloud Elastic Master Node, an existing deployment keeps its disk when the template is applied again.
  Where the size is a parameter, set it to 100 when you apply the new template to an existing deployment
  (`masterNodesDiskSize` on Google Cloud, `masterNodeDiskSize` on Oracle Cloud): Google Cloud recreates a
  Master Node whose disk size changes.
- Parameter names are the same on every Terraform and Bicep template. The old names still work and take
  precedence when set, but they are deprecated and will be removed in a future release:
  - Google Cloud and Oracle Cloud single node: `RTCEngine` is now `rtcEngine`, as in their Elastic and High
    Availability templates and on Azure and DigitalOcean.
  - Google Cloud and DigitalOcean High Availability: `masterNodesInstanceType` is now
    `masterNodeInstanceType`, as in every Elastic template and in Azure High Availability.

#### Google Cloud

- Every machine boots the latest Ubuntu 24.04 image (the `ubuntu-2404-lts` image family), as on the other
  clouds. Before, the templates were pinned to an image from December 2024. An existing single node or Master
  Node is not recreated when a newer image is published. The Media Nodes move to the image family once: the
  first time the new template is applied to an existing Elastic or High Availability deployment, its Media
  Nodes are replaced.

#### Oracle Cloud

- Single node defaults to 2 OCPUs and 8 GB of memory, the size of its own Elastic Master Node and of the
  4 vCPU and 8 GB machines of AWS and DigitalOcean. Before, it had 4 OCPUs with only 4 GB of memory.

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

#### Azure

- Elastic and High Availability: redeploying the template always failed, so no parameter could be changed
  after the first deployment:
  - `InUseSubnetCannotBeDeleted`: the Master Nodes' subnets were declared outside the virtual network, so a
    redeploy tried to delete them while the Master Nodes used them. Every subnet is now declared inside the
    virtual network.
  - `'Service Uri' must not be empty`: Azure Automation returns the URI of a webhook only when it creates it,
    so the scale-in action group lost it on every redeploy. Every deployment now creates the scale-in webhook
    under a new name. The webhooks of earlier deployments stay unused in the Automation account until they
    expire.

  A redeploy still cannot set the fixed, minimum or maximum number of Media Nodes below the Media Nodes
  running (`UnsupportedCapacity`); the administration documentation describes how to remove them first.
- Professional single node, Elastic and High Availability: the network security group rule for WebRTC over
  TCP opened only ports 50000 and 60000 instead of the range between them. It now opens 50000-60000, as the
  rule for UDP does.
- Single node and Elastic: the network security group still allowed port 9000 (MinIO) from the Internet.
  MinIO does not run in Azure deployments, which store recordings and application data in Azure Blob Storage,
  and the other clouds have kept this port closed since 3.9.0. The rule is removed.

#### Google Cloud

- Single node: the documentation names the media engine variable `rtcEngine`, but the template declared
  `RTCEngine`, so a value set as documented was not applied. Both names work now.

#### DigitalOcean

- Elastic and High Availability: the OpenVidu v2 compatibility module (`v2compatibility`) was not enabled by
  default, unlike on every other cloud and on DigitalOcean's Professional single node. It is now enabled by
  default.
- Elastic and High Availability: changing `fixedNumberOfMediaNodes` replaced every fixed Media Node, the ones
  that stay included, and cut their Rooms, because the Media Nodes' user data carried the number. It now
  carries only whether the number is fixed, so raising or lowering it creates or removes only the extra
  Media Nodes. A deployment with more than one fixed Media Node has them replaced once, the first time this
  version of the template is applied.
