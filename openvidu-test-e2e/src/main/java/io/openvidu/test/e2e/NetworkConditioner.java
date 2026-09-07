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
	 * TCP port of the SFU's ICE-TCP candidates (livekit.yaml {@code rtc.tcp_port}).
	 * Every OUTBOUND impairment meant to cut a publisher's media must cover it too.
	 * (clients can reconnect to this port with an ICE restart when the UDP media
	 * path is dead).
	 */
	public static final String SFU_ICE_TCP_PORT = "7881";

	/**
	 * UDP port of the SFU's embedded TURN server (livekit.yaml
	 * {@code turn.udp_port}). Same reasoning as {@link #SFU_ICE_TCP_PORT}: it is the
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

	// Name of the currently-running Pumba container to clear it.
	private static String currentPumbaContainerName;

	// Container that currently has an OUTBOUND blackout rule (a single iptables
	// OUTPUT DROP added
	// directly, not via Pumba). Tracked so clear() can flush it. See
	// blackoutOutbound().
	private static String blackoutContainer;

	public enum Direction {
		OUTBOUND, INBOUND
	}

	/**
	 * L4 protocol to scope the drop to. Only honored for {@link Direction#INBOUND}
	 */
	public enum Protocol {
		UDP, TCP
	}

	public static void pullImages() {
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
		runPumba(cmd);
	}

	/**
	 * Total OUTBOUND blackout: 100% packet loss across an ENTIRE SFU media port
	 * range, superseding any in-place single-port impairment. One native range rule
	 * (iptables matches {@code low:high} directly) reliably blocks all media,
	 * unlike a flaky 100-filter netem
	 *
	 * Stops the running Pumba first (avoids conflicting root qdiscs), then installs
	 * an iptables OUTPUT DROP rule over the whole UDP {@code mediaPortRange} (e.g.
	 * "7900-7999") plus one over the SFU's ICE-TCP port
	 * ({@link #SFU_ICE_TCP_PORT}) and one over its TURN listener
	 * ({@link #SFU_TURN_UDP_PORT}), so the browser's reconnect cannot fail over to
	 * TCP or to a relay candidate and escape the blackout.
	 */
	public static void blackoutOutbound(String targetContainer, String mediaPortRange, int durationSec) {
		clear();
		final String iptablesRange = mediaPortRange.replace('-', ':'); // iptables ranges are low:high
		log.info("Total OUTBOUND blackout (100% loss) on container {} across SFU media port range {}, "
				+ "ICE-TCP port {} and TURN port {} (iptables OUTPUT DROP)", targetContainer, mediaPortRange,
				SFU_ICE_TCP_PORT, SFU_TURN_UDP_PORT);
		String out = nettools(targetContainer, "iptables",
				"-A OUTPUT -o eth0 -p udp --dport " + iptablesRange + " -j DROP");
		log.info("blackout iptables -A OUTPUT (udp {}) result: {}", iptablesRange, out);
		// clear() flushes the whole OUTPUT chain, so this rule goes away with the other
		// one
		String outTcp = nettools(targetContainer, "iptables",
				"-A OUTPUT -o eth0 -p tcp --dport " + SFU_ICE_TCP_PORT + " -j DROP");
		log.info("blackout iptables -A OUTPUT (tcp {}) result: {}", SFU_ICE_TCP_PORT, outTcp);
		String outTurn = nettools(targetContainer, "iptables",
				"-A OUTPUT -o eth0 -p udp --dport " + SFU_TURN_UDP_PORT + " -j DROP");
		log.info("blackout iptables -A OUTPUT (udp {}) result: {}", SFU_TURN_UDP_PORT, outTurn);
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
		runPumba(cmd);
	}

	/**
	 * Stop the current Pumba container (SIGTERM) so it reverts the netem qdisc /
	 * iptables rule immediately.
	 */
	public static void clear() {
		if (currentPumbaContainerName != null) {
			log.info("Clearing network impairment (stopping Pumba container {})", currentPumbaContainerName);
			commandLine.executeCommand("docker stop -t 5 " + currentPumbaContainerName, 30);
			currentPumbaContainerName = null;
		}
		if (blackoutContainer != null) {
			log.info("Clearing OUTBOUND blackout (flushing iptables OUTPUT) on container {}", blackoutContainer);
			// Flush the OUTPUT chain: the blackout DROP is the only rule we ever add there
			nettools(blackoutContainer, "iptables", "-F OUTPUT");
			blackoutContainer = null;
		}
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
		currentPumbaContainerName = "pumba-netem-" + System.currentTimeMillis();
		return "docker run -d --name " + currentPumbaContainerName + " --rm -v " + DOCKER_SOCK + ":" + DOCKER_SOCK + " "
				+ PUMBA_IMAGE;
	}

	private static void runPumba(String cmd) {
		log.info("Applying network impairment via Pumba: {}", cmd);
		String out = commandLine.executeCommand(cmd, 60);
		log.info("Pumba started: {}", out);
	}
}
