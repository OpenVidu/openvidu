package io.openvidu.server.test.unit;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

import org.junit.jupiter.api.Test;

import io.openvidu.server.config.Dotenv;
import io.openvidu.server.config.Dotenv.DotenvFormatException;

class DotenvTest {

	@Test
	void loadTest() throws IOException, DotenvFormatException {

		// Given
		Path envFile = createDotenvTestFile();

		Dotenv dotenv = new Dotenv();

		// When
		dotenv.read(envFile);

		// Then
		assertEquals("value1", dotenv.get("PROPERTY_ONE"));
		assertEquals("value2", dotenv.get("PROPERTY_TWO"));
	}

	@Test
	void writeSameFileTest() throws IOException, DotenvFormatException {

		// Given
		Path envFile = createDotenvTestFile();
		String originalEnvContent = new String(Files.readAllBytes(envFile));

		Dotenv dotenv = new Dotenv();

		// When
		dotenv.read(envFile);

		Files.delete(envFile);

		dotenv.write();
		String recreatedEnvContent = new String(Files.readAllBytes(envFile));

		// Then
		assertEquals(originalEnvContent, recreatedEnvContent);
	}

	@Test
	void writeModifiedFileTest() throws IOException, DotenvFormatException {

		// Given
		Path envFile = createDotenvTestFile();

		Dotenv dotenv = new Dotenv();

		// When
		dotenv.read(envFile);

		dotenv.set("PROPERTY_ONE", "value_one");
		dotenv.set("PROPERTY_TWO", "value_two");
		dotenv.set("PROPERTY_THREE", "value_three");

		dotenv.write();

		Dotenv updDotenv = new Dotenv();
		updDotenv.read(envFile);

		// Then
		assertEquals("value_one", updDotenv.get("PROPERTY_ONE"));
		assertEquals("value_two", updDotenv.get("PROPERTY_TWO"));
		assertEquals("value_three", updDotenv.get("PROPERTY_THREE"));
	}

	private Path createDotenvTestFile() throws IOException {
		Path envFile = Files.createTempFile("env", ".tmp");
		Files.copy(getClass().getResourceAsStream("/.env"), envFile, StandardCopyOption.REPLACE_EXISTING);
		return envFile;
	}

}
