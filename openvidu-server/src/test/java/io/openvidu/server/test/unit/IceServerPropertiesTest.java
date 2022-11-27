package io.openvidu.server.test.unit;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import io.openvidu.java.client.IceServerProperties;

public class IceServerPropertiesTest {

	@Test
	@DisplayName("IceServerProperty exceptions tests")
	public void iceServerPropertiesExceptionTest() {
		// Wrong urls
		notValidIceServerTest("wrongurl", null, null,
				"Not a valid TURN/STUN uri provided. No colons found in: 'wrongurl'");
		notValidIceServerTest("wrongurl", "anyuser", null,
				"Not a valid TURN/STUN uri provided. No colons found in: 'wrongurl'");
		notValidIceServerTest("wrongurl", null, "anypassword",
				"Not a valid TURN/STUN uri provided. No colons found in: 'wrongurl'");
		notValidIceServerTest("wrongurl", "anyuser", "anypassword",
				"Not a valid TURN/STUN uri provided. No colons found in: 'wrongurl'");

		// Wrong prefixes
		notValidIceServerTest("turnss:wrongurl", null, null,
				"The protocol 'turnss' is invalid. Only valid values are: [turn, turns] [stuns, stun]");
		notValidIceServerTest("stunss:wrongurl", "anyuser", null,
				"The protocol 'stunss' is invalid. Only valid values are: [turn, turns] [stuns, stun]");
		notValidIceServerTest("anything:wrongurl", null, "anypassword",
				"The protocol 'anything' is invalid. Only valid values are: [turn, turns] [stuns, stun]");
		notValidIceServerTest(":", null, null,
				"The protocol '' is invalid. Only valid values are: [turn, turns] [stuns, stun]");
		notValidIceServerTest("", null, null, "Not a valid TURN/STUN uri provided. No colons found in: ''");

		// Try invalid host and ports
		notValidIceServerTest("stun:hostname.com:99a99", null, null,
				"The port defined in 'stun:hostname.com:99a99' is not a number (0-65535)");
		notValidIceServerTest("stun:hostname.com:-1", null, null,
				"The port defined in 'stun:hostname.com:-1' is not a valid port number (0-65535)");
		notValidIceServerTest("stun:hostname:port:more", null, null,
				"Host or port are not correctly defined in STUN/TURN uri: 'stun:hostname:port:more'");
		notValidIceServerTest("stun:hostname.com:port more", null, null,
				"The port defined in 'stun:hostname.com:port more' is not a number (0-65535)");
		notValidIceServerTest("stun:hostname.com:", null, null,
				"Host or port are not correctly defined in STUN/TURN uri: 'stun:hostname.com:'");
		notValidIceServerTest("stun:[1:2:3:4:5:6:7:8]junk:1000", null, null,
				"Port is not specified correctly after IPv6 in uri: 'stun:[1:2:3:4:5:6:7:8]junk:1000'");
		notValidIceServerTest("stun:[notvalid:]:1000", null, null,
				"Is not a valid Internet Address (IP or Domain Name): 'notvalid:'");
		notValidIceServerTest("stun::5555", null, null, "Host defined in 'stun::5555' is empty or null");
		notValidIceServerTest("stun:", null, null, "Host defined in 'stun:' is empty or null");

		// Illegal Uri tests according to RFC 3986 and RFC 7064 (URI schemes for STUN
		// and TURN)
		notValidIceServerTest("stun:/hostname.com", null, null,
				"Is not a valid Internet Address (IP or Domain Name): '/hostname.com'");
		notValidIceServerTest("stun:?hostname.com", null, null, "STUN uri can't have any '?' query param");
		notValidIceServerTest("stun:#hostname.com", null, null,
				"Is not a valid Internet Address (IP or Domain Name): '#hostname.com'");

		// illegal ?transport=xxx tests in turn uris
		notValidIceServerTest("turn:hostname.com?transport=invalid", "anyuser", "anypassword",
				"Wrong value specified in STUN/TURN uri: 'turn:hostname.com?transport=invalid'. Unique valid arguments after '?' are '?transport=tcp' or '?transport=udp");
		notValidIceServerTest("turn:hostname.com?transport=", "anyuser", "anypassword",
				"Wrong value specified in STUN/TURN uri: 'turn:hostname.com?transport='. Unique valid arguments after '?' are '?transport=tcp' or '?transport=udp");
		notValidIceServerTest("turn:hostname.com?=", "anyuser", "anypassword",
				"Wrong value specified in STUN/TURN uri: 'turn:hostname.com?='. Unique valid arguments after '?' are '?transport=tcp' or '?transport=udp");
		notValidIceServerTest("turn:hostname.com?", "anyuser", "anypassword",
				"Wrong value specified in STUN/TURN uri: 'turn:hostname.com?'. Unique valid arguments after '?' are '?transport=tcp' or '?transport=udp");
		notValidIceServerTest("?", "anyuser", "anypassword",
				"Not a valid TURN/STUN uri provided. No colons found in: '?'");

		// Transport can not be defined in STUN
		notValidIceServerTest("stun:hostname.com?transport=tcp", null, null, "STUN uri can't have any '?' query param");
		notValidIceServerTest("stun:hostname.com?transport=udp", null, null, "STUN uri can't have any '?' query param");

		// Stun can not have credentials defined
		notValidIceServerTest("stun:hostname.com", "username", "credential",
				"Credentials can not be defined while using stun.");
		notValidIceServerTest("stun:hostname.com", "username", "credential",
				"Credentials can not be defined while using stun.");
		notValidIceServerTest("stun:hostname.com", "username", null,
				"Credentials can not be defined while using stun.");
		notValidIceServerTest("stun:hostname.com", null, "credential",
				"Credentials can not be defined while using stun.");

		// Turn must have credentials
		notValidIceServerTest("turn:hostname.com", null, null, "Credentials must be defined while using turn");
		notValidIceServerTest("turn:hostname.com", "username", null, "Credentials must be defined while using turn");
		notValidIceServerTest("turn:hostname.com", null, "credential", "Credentials must be defined while using turn");
	}

	@Test
	@DisplayName("IceServerProperty exceptions tests")
	public void iceServerPropertiesValidTest() {
		// Stun and stuns
		validIceServerTest("stun:hostname.com", null, null);
		validIceServerTest("stuns:hostname.com", null, null);

		// Turn and turns
		validIceServerTest("turn:hostname.com", "anyuser", "credential");
		validIceServerTest("turns:hostname.com", "anyuser", "credential");

		// Test IPv4/IPv6/hostname and with/without port
		validIceServerTest("stun:1.2.3.4:1234", null, null);
		validIceServerTest("stun:[1:2:3:4:5:6:7:8]:4321", null, null);
		validIceServerTest("stun:hostname.com:9999", null, null);
		validIceServerTest("stun:1.2.3.4", null, null);
		validIceServerTest("stun:[1:2:3:4:5:6:7:8]", null, null);
		validIceServerTest("stuns:1.2.3.4:1234", null, null);
		validIceServerTest("stuns:[1:2:3:4:5:6:7:8]:4321", null, null);
		validIceServerTest("stuns:hostname.com:9999", null, null);
		validIceServerTest("stuns:1.2.3.4", null, null);
		validIceServerTest("stuns:[1:2:3:4:5:6:7:8]", null, null);
		validIceServerTest("turn:1.2.3.4:1234", "anyuser", "credential");
		validIceServerTest("turn:[1:2:3:4:5:6:7:8]:4321", "anyuser", "credential");
		validIceServerTest("turn:hostname.com:9999", "anyuser", "credential");
		validIceServerTest("turn:1.2.3.4", "anyuser", "credential");
		validIceServerTest("turn:[1:2:3:4:5:6:7:8]", "anyuser", "credential");
		validIceServerTest("turns:1.2.3.4:1234", "anyuser", "credential");
		validIceServerTest("turns:[1:2:3:4:5:6:7:8]:4321", "anyuser", "credential");
		validIceServerTest("turns:hostname.com:9999", "anyuser", "credential");
		validIceServerTest("turns:1.2.3.4", "anyuser", "credential");
		validIceServerTest("turns:[1:2:3:4:5:6:7:8]", "anyuser", "credential");

		// Test valid ?transport=tcp or ?transport=udp
		validIceServerTest("turn:hostname.com:1234?transport=tcp", "anyuser", "credential");
		validIceServerTest("turn:hostname.com?transport=udp", "anyuser", "credential");
		validIceServerTest("turn:1.2.3.4:1234?transport=tcp", "anyuser", "credential");
		validIceServerTest("turn:1.2.3.4?transport=udp", "anyuser", "credential");
		validIceServerTest("turn:[1:2:3:4:5:6:7:8]:4321?transport=udp", "anyuser", "credential");
		validIceServerTest("turn:[1:2:3:4:5:6:7:8]?transport=udp", "anyuser", "credential");
	}

	private void validIceServerTest(String url, String username, String credential) {
		assertDoesNotThrow(() -> {
			IceServerProperties.Builder iceServerPropertiesBuilder = new IceServerProperties.Builder().url(url);
			if (username != null) {
				iceServerPropertiesBuilder.username(username);
			}
			if (credential != null) {
				iceServerPropertiesBuilder.credential(credential);
			}
			IceServerProperties iceServerProperties = iceServerPropertiesBuilder.build();
			assertEquals(url, iceServerProperties.getUrl());
			if (username != null) {
				assertEquals(username, iceServerProperties.getUsername());
			}
			if (credential != null) {
				assertEquals(credential, iceServerProperties.getCredential());
			}
		});
	}

	private void notValidIceServerTest(String url, String username, String credential, String expectedMessage) {
		Exception exception = assertThrows(IllegalArgumentException.class, () -> {
			IceServerProperties.Builder iceServerPropertiesBuilder = new IceServerProperties.Builder().url(url);
			if (username != null) {
				iceServerPropertiesBuilder.username(username);
			}
			if (credential != null) {
				iceServerPropertiesBuilder.credential(credential);
			}
			iceServerPropertiesBuilder.build();
		});

		String actualMessage = exception.getMessage();
		assertEquals(actualMessage, expectedMessage);
	}

}
