package io.openvidu.java.client;

public class SessionProperties {

	private MediaMode mediaMode;
	private ArchiveMode archiveMode;
	private ArchiveLayout archiveLayout;

	public static class Builder {

		private MediaMode mediaMode = MediaMode.ROUTED;
		private ArchiveMode archiveMode = ArchiveMode.MANUAL;
		private ArchiveLayout archiveLayout = ArchiveLayout.BEST_FIT;

		public SessionProperties build() {
			return new SessionProperties(this.mediaMode, this.archiveMode, this.archiveLayout);
		}

		public SessionProperties.Builder mediaMode(MediaMode mediaMode) {
			this.mediaMode = mediaMode;
			return this;
		}

		public SessionProperties.Builder archiveMode(ArchiveMode archiveMode) {
			this.archiveMode = archiveMode;
			return this;
		}

		public SessionProperties.Builder archiveLayout(ArchiveLayout archiveLayout) {
			this.archiveLayout = archiveLayout;
			return this;
		}

	}

	protected SessionProperties() {
		this.mediaMode = MediaMode.ROUTED;
		this.archiveMode = ArchiveMode.MANUAL;
		this.archiveLayout = ArchiveLayout.BEST_FIT;
	}

	private SessionProperties(MediaMode mediaMode, ArchiveMode archiveMode, ArchiveLayout archiveLayout) {
		this.mediaMode = mediaMode;
		this.archiveMode = archiveMode;
		this.archiveLayout = archiveLayout;
	}

	public ArchiveMode archiveMode() {
		return this.archiveMode;
	}

	public MediaMode mediaMode() {
		return this.mediaMode;
	}

	public ArchiveLayout archiveLayout() {
		return this.archiveLayout;
	}

}