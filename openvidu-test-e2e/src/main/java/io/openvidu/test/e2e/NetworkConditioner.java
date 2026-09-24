package io.openvidu.test.e2e;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import io.openvidu.test.browsers.utils.CommandLineExecutor;

public class NetworkConditioner {

	private static final Logger log = LoggerFactory.getLogger(NetworkConditioner.class);
	private static final CommandLineExecutor commandLine = new CommandLineExecutor();

	private static final String PUMBA_IMAGE = "gaiaadm/pumba:1.2.1";
	private static final String NETTOOLS_IMAGE = "ghcr.io/alexei-led/pumba-alpine-nettools:sha-19e0a46";

	/**
	 * Port range of the SFU's host candidates (livekit.yaml
	 * {@code rtc.port_range_start} / {@code rtc.port_range_end}): their UDP ports
	 * with both engines, and the TCP ports of their ICE-TCP candidates too with
	 * mediasoup, where each transport listens for ICE-TCP on a port of its own.
	 */
	public static final String SFU_RTC_PORT_RANGE = "7900-7999";

	/**
	 * TCP port of the SFU's ICE-TCP candidates with pion (livekit.yaml
	 * {@code rtc.tcp_port}). Every OUTBOUND impairment meant to cut a publisher's
	 * media must cover it too, and TCP over {@link #SFU_RTC_PORT_RANGE} for
	 * mediasoup (clients can reconnect over ICE-TCP with an ICE restart when the
	 * UDP media path is dead).
	 */
	public static final String SFU_ICE_TCP_PORT = "7881";

	/**
	 * UDP port of the SFU's embedded TURN server (livekit.yaml
	 * {@code turn.udp_port}). Same reasoning as {@link #SFU_ICE_TCP_PORT}: it is
	 * the
	 * last route out of a media blackout, since a client whose host and srflx
	 * candidates are all dead falls back to allocating a TURN relay. Blocking the
	 * listener is enough; the relay range ({@code turn.relay_range_*}) is where the
	 * TURN server sends from towards the peer, never a destination of the client.
	 */
	public static final String SFU_TURN_UDP_PORT = "3478";
	private static final String DOCKER_SOCK = "/var/run/docker.sock";

	// Where Pumba installs the netem qdisc of a port-scoped netem impairment. Pumba
	// 1.x owns the whole tree under the reserved root handle 504d: (prio, 3 bands)
	// with netem on band 3, and verifies exactly this topology before removing it
	// (pkg/tc/netem.go in the Pumba repo), so it is a stable contract of the pinned
	// PUMBA_IMAGE version. Re-check it when bumping the pin (0.x used 1:3 / 30:).
	private static final String PUMBA_NETEM_QDISC = "parent 504d:3 handle 5050:";

	// Upper bound on expanded ports: Pumba creates one tc filter / iptables rule
	// per port, so a huge range would be slow and fragile. The SFU RTC range (e.g.
	// 7900-7999) is 100 ports. This value covers it.
	private static final int MAX_EXPANDED_PORTS = 1024;

	// Names of the running Pumba containers, to stop them all on clear(). A test
	// may run several at once: each Pumba iptables command drops a single L4
	// protocol, see blockInboundPackets().
	private static final List<String> pumbaContainerNames = new ArrayList<>();

	// Container that currently has OUTBOUND DROP rules (iptables OUTPUT rules
	// added directly, not via Pumba). Tracked so clear() can flush them. See
	// blockOutboundPackets().
	private static String blackoutContainer;

	// Both Pumba images are pinned to an immutable tag: pulling them once per JVM
	// is enough. See pullImages().
	private static final java.util.concurrent.atomic.AtomicBoolean imagesPulled = new java.util.concurrent.atomic.AtomicBoolean();

	// Container Pumba is currently impairing. Tracked so that clear() can scrub its
	// network namespace itself instead of trusting Pumba to have reverted.
	private static String impairedContainer;

	// SIGTERM-to-SIGKILL grace given to Pumba on clear(). Reverting is not just a
	// syscall for Pumba: it starts ANOTHER container (the nettools sidecar) to run
	// the tc/iptables delete, so on a loaded Docker daemon it can take much longer
	// than the usual 1-2 s. Killed halfway, it leaves the impairment installed.
	private static final int PUMBA_STOP_GRACE_SEC = 20;

	public enum Direction {
		OUTBOUND, INBOUND
	}

	/**
	 * L4 protocol to scope the drop to. Only honored for {@link Direction#INBOUND}
	 */
	public enum Protocol {
		UDP, TCP
	}

	/**
	 * Pulls the Pumba images, once per JVM. Both are pinned to an immutable tag, so
	 * re-pulling them before every connection-quality test only buys another chance
	 * of hitting a registry or DNS hiccup: seen in CI taking 171 s instead of the
	 * usual 3 s, in the middle of the network outage that then kept the bridged
	 * browser from connecting at all (run 35203642658).
	 */
	public static void pullImages() {
		if (!imagesPulled.compareAndSet(false, true)) {
			return;
		}
		log.info("Pulling Pumba images {} and {}", PUMBA_IMAGE, NETTOOLS_IMAGE);
		commandLine.executeCommand("docker pull " + PUMBA_IMAGE, 180);
		commandLine.executeCommand("docker pull " + NETTOOLS_IMAGE, 180);
	}

	public static void applyLossToOutboundPackets(String targetContainer, String remotePorts, int lossPercent,
			int durationSec) {
		log.info("Dropping " + lossPercent + "% of packets leaving container " + targetContainer
				+ " with destination port " + remotePorts + " during " + durationSec + " seconds");
		applyLoss(targetContainer, NetworkConditioner.Direction.OUTBOUND, null, remotePorts, lossPercent, durationSec);
	}

	public static void applyLossToInboundPackets(String targetContainer, Protocol protocol, String remotePorts,
			int lossPercent, int durationSec) {
		log.info("Dropping " + lossPercent + "% of packets entering container " + targetContainer
				+ " with origin port " + remotePorts + " during " + durationSec + " seconds");
		applyLoss(targetContainer, NetworkConditioner.Direction.INBOUND, protocol, remotePorts, lossPercent,
				durationSec);
	}

	/**
	 * Drop every packet entering {@code targetContainer} from {@code remotePorts}
	 * over {@code protocol}, and wait until the drop is actually installed: Pumba
	 * runs detached and adds its iptables rules from a sidecar container of its
	 * own, which can take a few seconds. Each call starts one more Pumba container,
	 * so that several protocols can be blocked at once. {@link #clear()} stops them
	 * all.
	 */
	public static void blockInboundPackets(String targetContainer, Protocol protocol, String remotePorts,
			int durationSec) {
		final String ports = expandPorts(remotePorts);
		if (ports == null) {
			throw new IllegalArgumentException("blockInboundPackets needs the source ports to block");
		}
		applyLossToInboundPackets(targetContainer, protocol, remotePorts, 100, durationSec);
		final String proto = "-p " + protocol.name().toLowerCase(Locale.US) + " ";
		final List<String> missingPorts = new ArrayList<>(List.of(ports.split(",")));
		final long deadline = System.currentTimeMillis() + 60000;
		while (true) {
			// Split on the rule prefix: the command output comes with its lines joined
			String[] rules = nettools(targetContainer, "iptables", "-S INPUT").split("-A INPUT");
			missingPorts.removeIf(port -> {
				for (String rule : rules) {
					if (rule.contains(proto) && rule.contains("--sport " + port + " ") && rule.contains("DROP")) {
						return true;
					}
				}
				return false;
			});
			if (missingPorts.isEmpty()) {
				log.info("Pumba is dropping every {} packet entering container {} from port {}", protocol,
						targetContainer, remotePorts);
				return;
			}
			if (System.currentTimeMillis() > deadline) {
				throw new IllegalStateException("Pumba did not install its INPUT DROP rules on container "
						+ targetContainer + " for " + protocol + " source ports " + missingPorts);
			}
			try {
				Thread.sleep(1000);
			} catch (InterruptedException e) {
				Thread.currentThread().interrupt();
				throw new IllegalStateException(e);
			}
		}
	}

	/**
	 * Update the OUTBOUND packet-loss percentage in place (no Pumba restart).
	 * {@code tc qdisc change} re-applies the netem parameters of the qdisc Pumba
	 * installed for the port-scoped egress filter (loss at the new percentage, tc
	 * defaults for everything else, which is all Pumba set), leaving the root prio
	 * qdisc and its port filters untouched. Requires a prior
	 * {@link #applyLossToOutboundPackets} with a {@code durationSec} long enough to
	 * span the whole ramp: once Pumba's duration expires it removes the qdisc and
	 * this fails.
	 */
	public static void updateOutboundLossPercent(String targetContainer, int lossPercent) {
		log.info("Updating OUTBOUND packet loss on container {} to {}% in place (tc qdisc change, no Pumba restart)",
				targetContainer, lossPercent);
		// Naming both parent and handle makes tc fail unless the tree is Pumba's. tc
		// prints nothing on success, so any output means the change was rejected (e.g.
		// "Failed to find specified qdisc" when no impairment is installed).
		String out = nettools(targetContainer, "tc",
				"qdisc change dev eth0 " + PUMBA_NETEM_QDISC + " netem loss " + lossPercent + "%");
		if (!out.isBlank()) {
			throw new IllegalStateException("tc qdisc change to " + lossPercent + "% loss failed on container "
					+ targetContainer + ": " + out.trim());
		}
	}

	/**
	 * Update the INBOUND packet-loss percentage in place
	 */
	public static void updateInboundLossPercent(String targetContainer, Protocol protocol, String remotePorts,
			int lossPercent) {
		final String ports = expandPorts(remotePorts);
		if (ports == null) {
			throw new IllegalArgumentException(
					"updateInboundLossPercent needs the same remotePorts passed to applyLossToInboundPackets");
		}
		final String proto = protocol.name().toLowerCase(Locale.US);
		final String probability = String.format(Locale.US, "%.2f", Math.max(0.0, Math.min(1.0, lossPercent / 100.0)));
		log.info("Updating INBOUND packet loss on container {} to {}% in place (iptables -R, no Pumba restart)",
				targetContainer, lossPercent);

		// 1) Read the live INPUT rules (spec form) to find each port's DROP rule index
		String[] rules = nettools(targetContainer, "iptables", "-S INPUT").split("-A INPUT");

		// 2) Build an atomic `iptables -R` per target port (rules[0] is the "-P INPUT
		// ..." policy).
		StringBuilder script = new StringBuilder();
		for (String port : ports.split(",")) {
			int ruleNumber = -1;
			for (int i = 1; i < rules.length; i++) {
				if (rules[i].contains("--sport " + port + " ") && rules[i].contains("statistic")
						&& rules[i].contains("DROP")) {
					ruleNumber = i;
					break;
				}
			}
			if (ruleNumber < 0) {
				log.warn("No INPUT DROP rule found for source port {} on container {}; skipping", port,
						targetContainer);
				continue;
			}
			if (script.length() > 0) {
				script.append("; ");
			}
			script.append("iptables -R INPUT ").append(ruleNumber).append(" -i eth0 -p ").append(proto)
					.append(" --sport ").append(port).append(" -m statistic --mode random --probability ")
					.append(probability).append(" -j DROP");
		}
		if (script.length() == 0) {
			log.warn("updateInboundLossPercent: no matching INPUT rules found on container {}; nothing updated",
					targetContainer);
			return;
		}

		// 3) Apply all replacements in one sidecar
		String out = nettools(targetContainer, "sh", "-c \"" + script + "\"");
		log.info("iptables -R result: {}", out);
	}

	/**
	 * Drop a percentage of packets matching {@code direction} + {@code protocol} +
	 * {@code remotePorts}.
	 *
	 * @param targetContainer docker name/ID of the impaired container. Should never
	 *                        be --network=host
	 * @param direction       {@link Direction#OUTBOUND} (egress, via netem) or
	 *                        {@link Direction#INBOUND} (ingress, via iptables)
	 * @param protocol        {@link Protocol#UDP}/{@link Protocol#TCP}; honored for
	 *                        INBOUND, logged-and-ignored for OUTBOUND (netem cannot
	 *                        filter protocol)
	 * @param remotePorts     the SFU/remote port(s): a single port ("7780"), a
	 *                        comma list ("7880,7881") or a range
	 *                        ("7900-7999"/"7900:7999"); expanded to a comma list
	 *                        (Pumba accepts no range syntax). null/blank = no port
	 *                        filter (whole interface).
	 * @param lossPercent     packet loss percentage (0-100); for INBOUND this maps
	 *                        to a 0.0-1.0 per-packet probability
	 * @param durationSec     how long Pumba keeps the impairment before
	 *                        auto-reverting
	 */
	private static void applyLoss(String targetContainer, Direction direction, Protocol protocol, String remotePorts,
			int lossPercent, int durationSec) {
		final String ports = expandPorts(remotePorts);
		final String cmd;
		if (direction == Direction.OUTBOUND) {
			if (protocol != null) {
				log.warn("Pumba netem (egress) cannot filter by L4 protocol; ignoring protocol={} for OUTBOUND loss "
						+ "(the SFU RTC media ports are UDP-only, so this is equivalent to a UDP filter).", protocol);
			}
			StringBuilder opts = new StringBuilder("--duration ").append(durationSec).append("s --interface eth0")
					.append(" --tc-image ").append(NETTOOLS_IMAGE);
			if (ports != null) {
				// remotePorts = SFU ports = DESTINATION of the client's egress packets =>
				// --ingress-port (dport)
				opts.append(" --ingress-port ").append(ports);
			}
			cmd = pumbaRun() + " netem " + opts + " loss --percent " + lossPercent + " " + targetContainer;
		} else {
			double probability = Math.max(0.0, Math.min(1.0, lossPercent / 100.0));
			StringBuilder opts = new StringBuilder("--duration ").append(durationSec).append("s --interface eth0")
					.append(" --iptables-image ").append(NETTOOLS_IMAGE);
			if (protocol != null) {
				opts.append(" --protocol ").append(protocol.name().toLowerCase(Locale.US));
			}
			if (ports != null) {
				// remotePorts = SFU ports = SOURCE of the client's ingress packets =>
				// --src-port (sport).
				// Note: iptables only allows a port filter together with a tcp/udp protocol.
				if (protocol == null) {
					throw new IllegalArgumentException(
							"INBOUND loss with a port filter requires a protocol (Pumba iptables --src-port needs -p tcp/udp)");
				}
				opts.append(" --src-port ").append(ports);
			}
			cmd = pumbaRun() + " iptables " + opts + " loss --mode random --probability "
					+ String.format(Locale.US, "%.2f", probability) + " " + targetContainer;
		}
		impairedContainer = targetContainer;
		runPumba(cmd);
	}

	/**
	 * Total OUTBOUND blackout: 100% packet loss across an ENTIRE SFU media port
	 * range, superseding any in-place single-port impairment. One native range rule
	 * (iptables matches {@code low:high} directly) reliably blocks all media,
	 * unlike a flaky 100-filter netem
	 *
	 * Stops the running Pumba first (avoids conflicting root qdiscs), then drops
	 * UDP and TCP over the whole {@code mediaPortRange} (e.g. "7900-7999"), TCP to
	 * the SFU's ICE-TCP port ({@link #SFU_ICE_TCP_PORT}) and UDP to its TURN
	 * listener ({@link #SFU_TURN_UDP_PORT}), so the browser's reconnect cannot fail
	 * over to TCP or to a relay candidate and escape the blackout.
	 */
	public static void blackoutOutbound(String targetContainer, String mediaPortRange, int durationSec) {
		clear();
		blockOutboundPackets(targetContainer, Protocol.UDP, mediaPortRange);
		blockOutboundPackets(targetContainer, Protocol.TCP, mediaPortRange);
		blockOutboundPackets(targetContainer, Protocol.TCP, SFU_ICE_TCP_PORT);
		blockOutboundPackets(targetContainer, Protocol.UDP, SFU_TURN_UDP_PORT);
	}

	/**
	 * Drop every packet leaving {@code targetContainer} towards {@code remotePorts}
	 * (a single port or a range) over {@code protocol}, with an iptables OUTPUT
	 * rule added directly: Pumba cannot filter the egress by protocol.
	 * {@link #clear()} flushes it.
	 */
	public static void blockOutboundPackets(String targetContainer, Protocol protocol, String remotePorts) {
		final String proto = protocol.name().toLowerCase(Locale.US);
		final String ports = remotePorts.replace('-', ':'); // iptables ranges are low:high
		String out = nettools(targetContainer, "iptables", "-A OUTPUT -o eth0 -p " + proto + " --dport " + ports
				+ " -j DROP");
		log.info("Dropping every {} packet leaving container {} towards port {} (iptables -A OUTPUT): {}", protocol,
				targetContainer, remotePorts, out.isBlank() ? "done" : out.trim());
		blackoutContainer = targetContainer;
	}

	/**
	 * Dump connectivity diagnostics for a bridged (netem) container towards the
	 * SFU, to debug why the isolated browser can't establish (e.g. in CI).
	 * Everything is probed from INSIDE the container's own network namespace (via
	 * the nettools sidecar), so it reflects exactly what the browser sees: its own
	 * IPs/routes/DNS, DNS resolution of the LiveKit host, and TCP/ICMP reachability
	 * of the signaling port. Best-effort: each probe tolerates missing tools /
	 * failures (logged inline).
	 */
	public static void logConnectivityDiagnostics(String netemContainer, String host, int signalingPort) {
		log.info("===== NETEM CONNECTIVITY DIAGNOSTICS (container={}, target={}:{}) =====", netemContainer, host,
				signalingPort);
		String script = String.join("; ", "echo '--- id/hostname ---'", "hostname 2>&1; id 2>&1",
				"echo '--- container IPs (hostname -i) ---'", "hostname -i 2>&1",
				"echo '--- all interfaces (ip -o addr) ---'", "ip -o addr 2>&1", "echo '--- routes (ip route) ---'",
				"ip route 2>&1", "echo '--- /etc/resolv.conf ---'", "cat /etc/resolv.conf 2>&1",
				"echo '--- DNS resolve " + host + " (nslookup) ---'", "nslookup " + host + " 2>&1",
				"echo '--- ping " + host + " ---'", "ping -c3 -W2 " + host + " 2>&1",
				"echo '--- TCP reach " + host + ":" + signalingPort + " (nc) ---'",
				"nc -w4 -v " + host + " " + signalingPort + " </dev/null 2>&1",
				"echo '--- HTTPS GET " + host + ":" + signalingPort + " (wget) ---'",
				"wget -T6 -t1 --no-check-certificate -O /dev/null https://" + host + ":" + signalingPort + " 2>&1");
		String out;
		try {
			out = nettools(netemContainer, "sh", "-c \"" + script + "\"", 60);
		} catch (Exception e) {
			out = "(diagnostics sidecar failed: " + e + ")";
		}
		log.info("[netem-diag]\n{}", out);
		log.info("===== END NETEM CONNECTIVITY DIAGNOSTICS =====");
	}

	/**
	 * Add delay + jitter to the target container's. OUTBOUND only: Pumba can only
	 * delay with netem/tc, which is egress-only.
	 */
	public static void applyDelay(String targetContainer, int delayMs, int jitterMs, int durationSec,
			String remotePorts) {
		final String ports = expandPorts(remotePorts);
		StringBuilder opts = new StringBuilder("--duration ").append(durationSec).append("s --interface eth0")
				.append(" --tc-image ").append(NETTOOLS_IMAGE);
		if (ports != null) {
			opts.append(" --ingress-port ").append(ports);
		}
		String cmd = pumbaRun() + " netem " + opts + " delay --time " + delayMs + " --jitter " + jitterMs + " "
				+ targetContainer;
		impairedContainer = targetContainer;
		runPumba(cmd);
	}

	/**
	 * Remove every impairment: stop the running Pumba containers (SIGTERM, so they
	 * revert the netem qdisc / iptables rules themselves) and then scrub the target's
	 * network namespace anyway, so that the impairment is gone whether or not
	 * Pumba got to revert it.
	 */
	public static void clear() {
		final String target = impairedContainer;
		impairedContainer = null;
		if (!pumbaContainerNames.isEmpty()) {
			// A single docker stop stops all of them in parallel
			final String names = String.join(" ", pumbaContainerNames);
			pumbaContainerNames.clear();
			log.info("Clearing network impairment (stopping Pumba containers {})", names);
			String out = commandLine.executeCommand("docker stop -t " + PUMBA_STOP_GRACE_SEC + " " + names + " 2>&1",
					PUMBA_STOP_GRACE_SEC + 30);
			log.info("docker stop {} result: {}", names, out);
		}
		if (blackoutContainer != null) {
			log.info("Clearing OUTBOUND drops (flushing iptables OUTPUT) on container {}", blackoutContainer);
			// Flush the OUTPUT chain: the DROP rules of blockOutboundPackets() are the only
			// ones we ever add there
			nettools(blackoutContainer, "iptables", "-F OUTPUT");
			blackoutContainer = null;
		}
		if (target != null) {
			scrubImpairments(target);
		}
	}

	/**
	 * Delete anything Pumba may have left behind in {@code targetContainer}'s
	 * network namespace: its INPUT DROP rules (ingress loss) and the root qdisc
	 * tree carrying its netem (egress loss/delay).
	 */
	private static void scrubImpairments(String targetContainer) {
		String out = nettools(targetContainer, "sh", "-c \"iptables -F INPUT; tc qdisc del dev eth0 root\"");
		log.info("Scrubbing leftover impairments on container {} (iptables -F INPUT; tc qdisc del dev eth0 root): {}",
				targetContainer, out.isBlank() ? "removed" : out.trim());
	}

	/**
	 * Expand a port spec into the comma-separated single-port list Pumba expects.
	 * Accepts single ports, comma lists and {@code from-to} / {@code from:to}
	 * ranges. Returns {@code null} for a blank spec (no port filter).
	 */
	static String expandPorts(String spec) {
		if (spec == null || spec.isBlank()) {
			return null;
		}
		List<String> out = new ArrayList<>();
		for (String rawToken : spec.split(",")) {
			String token = rawToken.trim();
			if (token.isEmpty()) {
				continue;
			}
			String sep = token.contains("-") ? "-" : (token.contains(":") ? ":" : null);
			if (sep != null) {
				String[] parts = token.split(Pattern.quote(sep));
				if (parts.length != 2) {
					throw new IllegalArgumentException("Invalid port range: " + token);
				}
				int from = parsePort(parts[0].trim());
				int to = parsePort(parts[1].trim());
				if (from > to) {
					int tmp = from;
					from = to;
					to = tmp;
				}
				for (int p = from; p <= to; p++) {
					out.add(String.valueOf(p));
				}
			} else {
				out.add(String.valueOf(parsePort(token)));
			}
			if (out.size() > MAX_EXPANDED_PORTS) {
				throw new IllegalArgumentException("Port spec '" + spec + "' expands to more than " + MAX_EXPANDED_PORTS
						+ " ports; Pumba creates one rule/filter per port. Narrow the range.");
			}
		}
		return out.isEmpty() ? null : String.join(",", out);
	}

	private static int parsePort(String s) {
		int port = Integer.parseInt(s);
		if (port < 0 || port > 65535) {
			throw new IllegalArgumentException("Port out of range (0-65535): " + port);
		}
		return port;
	}

	/**
	 * Run {@code entrypoint args} (tc, iptables, sh...) inside
	 * {@code targetContainer}'s network namespace through the nettools sidecar
	 * image, returning its combined stdout+stderr. --entrypoint is REQUIRED: the
	 * image's default entrypoint is `tail -f /dev/null`, so without overriding it
	 * the args would be handed to tail.
	 */
	private static String nettools(String targetContainer, String entrypoint, String args) {
		return nettools(targetContainer, entrypoint, args, 30);
	}

	private static String nettools(String targetContainer, String entrypoint, String args, int timeoutSec) {
		String cmd = "docker run --rm --network container:" + targetContainer + " --cap-add NET_ADMIN --entrypoint "
				+ entrypoint + " " + NETTOOLS_IMAGE + " " + args + " 2>&1";
		return commandLine.executeCommand(cmd, timeoutSec);
	}

	private static String pumbaRun() {
		final String name = "pumba-netem-" + System.currentTimeMillis() + "-" + pumbaContainerNames.size();
		pumbaContainerNames.add(name);
		return "docker run -d --name " + name + " --rm -v " + DOCKER_SOCK + ":" + DOCKER_SOCK + " " + PUMBA_IMAGE;
	}

	private static void runPumba(String cmd) {
		log.info("Applying network impairment via Pumba: {}", cmd);
		String out = commandLine.executeCommand(cmd, 60);
		log.info("Pumba started: {}", out);
	}
}
