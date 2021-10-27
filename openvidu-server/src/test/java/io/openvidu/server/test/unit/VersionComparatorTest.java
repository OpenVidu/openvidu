package io.openvidu.server.test.unit;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

import io.openvidu.server.utils.VersionComparator;
import io.openvidu.server.utils.VersionComparator.VersionMismatchException;

public class VersionComparatorTest {

	@Test
	void versionSyntaxWrongTest() throws VersionMismatchException {
		VersionComparator comparator = new VersionComparator();
		assertThrows(RuntimeException.class, () -> {
			comparator.checkVersionCompatibility("not_a_valid_semver", "2.21.0");
		});
		assertThrows(RuntimeException.class, () -> {
			comparator.checkVersionCompatibility("2.21.0", "not.valid.semver");
		});
		assertThrows(RuntimeException.class, () -> {
			comparator.checkVersionCompatibility("2.21", "2.21");
		});
		assertThrows(RuntimeException.class, () -> {
			comparator.checkVersionCompatibility("2.21.0", "2.21");
		});
		assertThrows(RuntimeException.class, () -> {
			comparator.checkVersionCompatibility("2", "2.21.0");
		});
		assertThrows(RuntimeException.class, () -> {
			comparator.checkVersionCompatibility("", "");
		});
	}

	@Test
	void versionsDoMatchTest() throws VersionMismatchException {
		VersionComparator comparator = new VersionComparator();
		comparator.checkVersionCompatibility("2.21.0", "2.21.0");
		comparator.checkVersionCompatibility("2.21.1", "2.21.0");
		comparator.checkVersionCompatibility("2.19.20", "2.19.0");
		comparator.checkVersionCompatibility("2.21.1-beta", "2.21.0");
		comparator.checkVersionCompatibility("3.0.0", "3.0.0-beta4");
	}

	@Test
	void versionsDoNotMatchButAreCompatibleTest() throws VersionMismatchException {
		VersionComparator comparator = new VersionComparator();
		try {
			comparator.checkVersionCompatibility("2.20.0", "2.21.0");
		} catch (VersionMismatchException e) {
			assertFalse(e.isIncompatible());
		}
		try {
			comparator.checkVersionCompatibility("2.20.5", "2.21.0");
		} catch (VersionMismatchException e) {
			assertFalse(e.isIncompatible());
		}
		try {
			comparator.checkVersionCompatibility("2.20.5-dev", "2.21.0");
		} catch (VersionMismatchException e) {
			assertFalse(e.isIncompatible());
		}
		try {
			comparator.checkVersionCompatibility("2.0.0", "2.0.0-dev1");
		} catch (VersionMismatchException e) {
			assertFalse(e.isIncompatible());
		}
	}

	@Test
	void versionsIncompatibleTest() {
		VersionComparator comparator = new VersionComparator();
		assertThrows(VersionMismatchException.class, () -> {
			comparator.checkVersionCompatibility("2.0.0", "3.0.0");
		});
		assertThrows(VersionMismatchException.class, () -> {
			comparator.checkVersionCompatibility("3.0.0", "2.0.0");
		});
		assertThrows(VersionMismatchException.class, () -> {
			comparator.checkVersionCompatibility("2.21.0", "2.23.0");
		});
		assertThrows(VersionMismatchException.class, () -> {
			comparator.checkVersionCompatibility("2.21.0", "2.30.0");
		});
		assertThrows(VersionMismatchException.class, () -> {
			comparator.checkVersionCompatibility("2.22.0-dev1", "2.21.0");
		});
		assertThrows(VersionMismatchException.class, () -> {
			comparator.checkVersionCompatibility("2.22.0", "2.21.0-dev1");
		});
	}

}
