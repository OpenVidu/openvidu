package io.openvidu.server.utils;

import java.util.concurrent.ThreadLocalRandom;

/**
 * Utility methods for generating short random identifiers without relying on
 * deprecated Apache Commons Lang helpers.
 */
public final class RandomIdGenerator {

	private static final char[] ALPHABETIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".toCharArray();
	private static final char[] ALPHANUMERIC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".toCharArray();

	private RandomIdGenerator() {
	}

	public static String alphabetic(int length) {
		return generate(length, ALPHABETIC);
	}

	public static String alphanumeric(int length) {
		return generate(length, ALPHANUMERIC);
	}

	private static String generate(int length, char[] alphabet) {
		if (length < 0) {
			throw new IllegalArgumentException("Length must be non-negative");
		}
		char[] result = new char[length];
		ThreadLocalRandom random = ThreadLocalRandom.current();
		for (int i = 0; i < length; i++) {
			result[i] = alphabet[random.nextInt(alphabet.length)];
		}
		return new String(result);
	}
}
