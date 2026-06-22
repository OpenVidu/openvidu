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

	private static final String PUMBA_IMAGE = "gaiaadm/pumba";
	private static final String NETTOOLS_IMAGE = "ghcr.io/alexei-led/pumba-alpine-nettools:latest";
	private static final String DOCKER_SOCK = "/var/run/docker.sock";

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
	 * {@code tc qdisc change} rewrites only the netem loss parameter of the qdisc
	 * Pumba installed for the port-scoped egress filter, preserving the queue and
	 * the port filters. Requires a prior {@link #applyLossToOutboundPackets} with a
	 * {@code durationSec} long enough to span the whole ramp.
	 */
	public static void updateOutboundLossPercent(String targetContainer, int lossPercent) {
		log.info("Updating OUTBOUND packet loss on container {} to {}% in place (tc qdisc change, no Pumba restart)",
				targetContainer, lossPercent);
		// --entrypoint tc is REQUIRED: the nettools image's default entrypoint is `tail
		// -f /dev/null`, so without overriding it the tc args would be handed to tail.
		// The netem qdisc MUST be named by its handle (30:) — `tc qdisc change` looks
		// it up by handle, so `parent 1:3` alone fails with "Failed to find specified
		// qdisc". Pumba adds it as `parent 1:3 handle 30:` (root prio 1: -> netem on
		// band 1:3), which we mirror here.
		String cmd = "docker run --rm --network container:" + targetContainer
				+ " --cap-add NET_ADMIN --entrypoint tc " + NETTOOLS_IMAGE
				+ " qdisc change dev eth0 parent 1:3 handle 30: netem loss " + lossPercent + "% 2>&1";
		String out = commandLine.executeCommand(cmd, 30);
		log.info("tc qdisc change result: {}", out);
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
		String listCmd = "docker run --rm --network container:" + targetContainer
				+ " --cap-add NET_ADMIN --entrypoint iptables " + NETTOOLS_IMAGE + " -S INPUT 2>&1";
		String[] rules = commandLine.executeCommand(listCmd, 30).split("-A INPUT");

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
		String replaceCmd = "docker run --rm --network container:" + targetContainer
				+ " --cap-add NET_ADMIN --entrypoint sh " + NETTOOLS_IMAGE + " -c \"" + script + "\" 2>&1";
		String out = commandLine.executeCommand(replaceCmd, 30);
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
	 * a SINGLE iptables OUTPUT DROP rule over the whole {@code mediaPortRange}
	 * (e.g. "7900-7999").
	 */
	public static void blackoutOutbound(String targetContainer, String mediaPortRange, int durationSec) {
		clear();
		final String iptablesRange = mediaPortRange.replace('-', ':'); // iptables ranges are low:high
		log.info("Total OUTBOUND blackout (100% loss) on container {} across SFU media port range {} "
				+ "(single iptables OUTPUT DROP)", targetContainer, mediaPortRange);
		String cmd = "docker run --rm --network container:" + targetContainer
				+ " --cap-add NET_ADMIN --entrypoint iptables " + NETTOOLS_IMAGE
				+ " -A OUTPUT -o eth0 -p udp --dport " + iptablesRange + " -j DROP 2>&1";
		String out = commandLine.executeCommand(cmd, 30);
		log.info("blackout iptables -A OUTPUT result: {}", out);
		blackoutContainer = targetContainer;
	}

	/**
	 * Dump connectivity diagnostics for a bridged (netem) container towards the SFU, to debug why the
	 * isolated browser can't establish (e.g. in CI). Everything is probed from INSIDE the container's
	 * own network namespace (via the nettools sidecar), so it reflects exactly what the browser sees:
	 * its own IPs/routes/DNS, DNS resolution of the LiveKit host, and TCP/ICMP reachability of the
	 * signaling port. Best-effort: each probe tolerates missing tools / failures (logged inline).
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
		String cmd = "docker run --rm --network container:" + netemContainer + " --cap-add NET_ADMIN --entrypoint sh "
				+ NETTOOLS_IMAGE + " -c \"" + script + "\" 2>&1";
		String out;
		try {
			out = commandLine.executeCommand(cmd, 60);
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
			String cmd = "docker run --rm --network container:" + blackoutContainer
					+ " --cap-add NET_ADMIN --entrypoint iptables " + NETTOOLS_IMAGE + " -F OUTPUT 2>&1";
			commandLine.executeCommand(cmd, 30);
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
