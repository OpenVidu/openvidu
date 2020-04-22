package io.openvidu.server.config;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.commons.lang3.tuple.ImmutablePair;
import org.apache.commons.lang3.tuple.Pair;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class Dotenv {

	public static class DotenvFormatException extends Exception {

		private static final long serialVersionUID = -7280645547648990756L;

		public DotenvFormatException(String msg) {
			super(msg);
		}
	}

	private static Logger log = LoggerFactory.getLogger(Dotenv.class);

	private List<String> lines;
	private Map<String, String> properties;

	private Path envFile;

	private List<String> additionalProperties = new ArrayList<>();

	public void read() throws IOException, DotenvFormatException {
		read(Paths.get(".env"));
	}

	public String get(String property) {
		return properties.get(property);
	}

	public Map<String, String> getAll() {
		return properties;
	}

	public Path getEnvFile() {
		return envFile;
	}

	public void write() throws IOException {
		write(envFile);
	}

	public void write(Path envFile) throws IOException {

		List<String> outLines = new ArrayList<>();

		int lineNumber = 1;
		for (String line : lines) {
			try {
				Pair<String, String> propValue = parseLine(envFile, line, lineNumber);
				if (propValue == null) {
					outLines.add(line);
				} else {
					outLines.add(propValue.getKey() + "=" + properties.get(propValue.getKey()));
				}
			} catch (DotenvFormatException e) {
				log.error("Previously parsed line is producing a parser error", e);
			}
			lineNumber++;
		}

		if (!additionalProperties.isEmpty()) {
			for (String prop : additionalProperties) {
				outLines.add(prop + "=" + properties.get(prop));
			}
		}

		Files.write(envFile, outLines, Charset.defaultCharset(), StandardOpenOption.CREATE);

	}

	public void read(Path envFile) throws IOException, DotenvFormatException {

		this.envFile = envFile;

		lines = Files.readAllLines(envFile);

		int lineNumber = 1;
		properties = new HashMap<>();
		for (String line : lines) {

			log.debug("Reading line '{}'", line);

			Pair<String, String> propValue = parseLine(envFile, line, lineNumber);

			if (propValue != null) {

				log.debug("Setting property {}={}", propValue.getKey(), propValue.getValue());

				properties.put(propValue.getKey(), propValue.getValue());
			}

			lineNumber++;
		}
	}

	private Pair<String, String> parseLine(Path envFile, String line, int lineNumber) throws DotenvFormatException {

		if (isWhitespace(line) || isComment(line)) {
			return null;
		}

		int index = line.indexOf("=");

		if (index == -1) {
			throw new DotenvFormatException("File " + envFile + " has a malformed line at position " + lineNumber
					+ " with content \"" + line + "\"");
		}

		String property = line.substring(0, index).trim();

		if (property.equals("")) {
			throw new DotenvFormatException("File " + envFile + " has a malformed line at position " + lineNumber
					+ " with content \"" + line + "\"");
		}

		String value = line.substring(index + 1);

		return ImmutablePair.of(property, value);
	}

	private boolean isComment(String line) {
		return line.startsWith("#") || line.startsWith("//");
	}

	private boolean isWhitespace(String line) {
		return line.trim().equals("");
	}

	public void set(String property, String value) {

		if (!properties.containsKey(property)) {
			additionalProperties.add(property);
		}

		this.properties.put(property, value);
	}

}
