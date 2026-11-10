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
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Reads the Docker images that the tests run from a Dockerfile on the classpath
 * that is never built: one stage per image, {@code FROM <image> AS <name>}.
 * Dependabot (.github/dependabot.yml, ecosystem "docker") reads that file too and
 * keeps the tags and digests up to date, which it cannot do in Java code.
 */
public final class PinnedImages {

	private static final Pattern FROM = Pattern.compile("FROM\\s+(?:--platform=\\S+\\s+)?(\\S+)\\s+AS\\s+([\\w-]+)",
			Pattern.CASE_INSENSITIVE);

	private PinnedImages() {
	}

	/**
	 * The image of the stage {@code name} of the Dockerfile {@code resource},
	 * resolved as {@link Class#getResource(String)} does: next to {@code owner}'s
	 * package, or from the classpath root if it starts with "/".
	 *
	 * @throws IllegalStateException if the file or the stage does not exist
	 */
	public static String get(Class<?> owner, String resource, String name) {
		String image = load(owner, resource).get(name);
		if (image == null) {
			throw new IllegalStateException("No stage " + name + " in Dockerfile " + resource);
		}
		return image;
	}

	private static Map<String, String> load(Class<?> owner, String resource) {
		try (InputStream in = owner.getResourceAsStream(resource)) {
			if (in == null) {
				throw new IllegalStateException(
						"Dockerfile " + resource + " not found on the classpath of " + owner.getName());
			}
			Map<String, String> images = new LinkedHashMap<>();
			for (String line : new String(in.readAllBytes(), StandardCharsets.UTF_8).split("\\R")) {
				Matcher from = FROM.matcher(line.strip());
				if (from.matches()) {
					images.put(from.group(2), from.group(1));
				}
			}
			return images;
		} catch (IOException e) {
			throw new UncheckedIOException("Could not read Dockerfile " + resource, e);
		}
	}

}
