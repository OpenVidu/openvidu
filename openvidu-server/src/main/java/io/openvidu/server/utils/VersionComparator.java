package io.openvidu.server.utils;

import java.util.regex.Pattern;

import org.apache.maven.artifact.versioning.DefaultArtifactVersion;

public class VersionComparator {

	// https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
	private final String OFFICIAL_SEMVER_REGEX = "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$";

	/**
	 * Checks if client version and server version are compatible with each other
	 * 
	 * @param clientVersion
	 * @param serverVersion
	 * @throws VersionMismatchException if versions do not comply with semver
	 *                                  format, or if client version and server
	 *                                  version do not match
	 */
	public void checkVersionCompatibility(String clientVersion, String serverVersion) throws VersionMismatchException {
		checkSemver(clientVersion, "openvidu-browser");
		checkSemver(serverVersion, "openvidu-server");
		DefaultArtifactVersion comparableClientVersion = new DefaultArtifactVersion(clientVersion);
		DefaultArtifactVersion comparableServerVersion = new DefaultArtifactVersion(serverVersion);
		if (comparableClientVersion.getMajorVersion() != comparableServerVersion.getMajorVersion()) {
			throw new VersionMismatchException(true, "Incompatible major versions of openvidu-browser (\""
					+ clientVersion + "\") and openvidu-server (\"" + serverVersion + "\")");
		}
		checkMinorVersions(comparableClientVersion, comparableServerVersion);
	}

	private void checkSemver(String version, String artifactName) {
		if (!Pattern.compile(OFFICIAL_SEMVER_REGEX).matcher(version).matches()) {
			throw new RuntimeException(
					"Version \"" + version + "\" of " + artifactName + " does not comply with semver format");
		}
	}

	private void checkMinorVersions(DefaultArtifactVersion clientVersion, DefaultArtifactVersion serverVersion)
			throws VersionMismatchException {
		int difference = serverVersion.getMinorVersion() - clientVersion.getMinorVersion();
		if (difference == 1) {
			throw new VersionMismatchException(false, "openvidu-browser \"" + clientVersion + "\" requires update to \""
					+ serverVersion.getMajorVersion() + "." + serverVersion.getMinorVersion() + ".x\"");
		}
		if (difference != 0) {
			throw new VersionMismatchException(true, "Incompatible minor versions of openvidu-browser (\""
					+ clientVersion + "\") and openvidu-server (\"" + serverVersion + "\")");
		}
	}

	public class VersionMismatchException extends Exception {

		private static final long serialVersionUID = 1L;

		private boolean incompatible;

		public VersionMismatchException(boolean incompatible, String errorMessage) {
			super(errorMessage);
			this.incompatible = incompatible;
		}

		public boolean isIncompatible() {
			return this.incompatible;
		}

	}

}
