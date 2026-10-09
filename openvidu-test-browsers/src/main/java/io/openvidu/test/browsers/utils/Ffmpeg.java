/*
 * (C) Copyright 2017-2026 OpenVidu (https://openvidu.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

package io.openvidu.test.browsers.utils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Runs ffmpeg and ffprobe as a Docker container
 */
public final class Ffmpeg {

	/**
	 * A static ffmpeg build with libdav1d, libvpx, libx264, libaom and libopus, its
	 * multi-arch digest pinned: an image moved under the same tag could decode
	 * differently. Bump the tag and the digest together. -DFFMPEG_IMAGE overrides
	 * it with an image of the same layout (/ffmpeg and /ffprobe), e.g.
	 * mwader/static-ffmpeg:latest.
	 */
	public static final String IMAGE = System.getProperty("FFMPEG_IMAGE",
			"mwader/static-ffmpeg:9.0.2@sha256:7d9bdaaf887f7e6ce6151f67325c344074b5ff1fb75316011c3376503e449a7b");

	private static String user;

	private Ffmpeg() {
	}

	/**
	 * The command line that runs {@code tool} ("ffmpeg" or "ffprobe") with
	 * {@code args} in a container of {@link #IMAGE}.
	 */
	public static String[] command(String tool, String... args) {
		List<String> command = new ArrayList<>(List.of("docker", "run", "--rm", "--quiet", "--user", user()));
		for (String dir : mounts(Arrays.asList(args))) {
			command.addAll(List.of("-v", dir + ":" + dir));
		}
		command.addAll(List.of("--entrypoint", "/" + tool, IMAGE));
		command.addAll(Arrays.asList(args));
		return command.toArray(new String[0]);
	}

	/** {@link #command(String, String...)}, with the tool first in the list. */
	public static String[] command(List<String> toolAndArgs) {
		return command(toolAndArgs.get(0), toolAndArgs.subList(1, toolAndArgs.size()).toArray(new String[0]));
	}

	/**
	 * The same as one /bin/sh command line, for {@link CommandLineExecutor}:
	 * {@code args} is what would follow the tool in a shell.
	 */
	public static String shellCommand(String tool, String args) {
		StringBuilder command = new StringBuilder("docker run --rm --quiet --user ").append(user());
		for (String dir : mounts(Arrays.asList(args.trim().split("\\s+")))) {
			command.append(" -v '").append(dir).append(":").append(dir).append("'");
		}
		return command.append(" --entrypoint /").append(tool).append(" ").append(IMAGE).append(" ").append(args)
				.toString();
	}

	/**
	 * Pulls {@link #IMAGE} up front: a missing image would otherwise be pulled by
	 * the first command, inside its timeout.
	 */
	public static void pullImage() throws IOException, InterruptedException {
		Process pull = new ProcessBuilder("docker", "pull", "--quiet", IMAGE).redirectErrorStream(true).start();
		String output = new String(pull.getInputStream().readAllBytes());
		if (!pull.waitFor(600, TimeUnit.SECONDS) || pull.exitValue() != 0) {
			throw new IOException("docker pull " + IMAGE + " failed: " + output.trim());
		}
	}

	private static Set<String> mounts(List<String> args) {
		Set<String> dirs = new LinkedHashSet<>();
		for (String arg : args) {
			if (!arg.startsWith("/")) {
				continue;
			}
			Path path = Path.of(arg).normalize();
			Path dir = Files.isDirectory(path) ? path : path.getParent();
			if (dir != null && dir.getParent() != null && Files.isDirectory(dir)) {
				dirs.add(dir.toString());
			}
		}
		return dirs;
	}

	private static synchronized String user() {
		if (user == null) {
			try {
				Path probe = Files.createTempFile("ffmpeg-user", ".tmp");
				try {
					user = Files.getAttribute(probe, "unix:uid") + ":" + Files.getAttribute(probe, "unix:gid");
				} finally {
					Files.deleteIfExists(probe);
				}
			} catch (IOException e) {
				throw new IllegalStateException("Could not read the current user's uid and gid", e);
			}
		}
		return user;
	}
}
