package io.openvidu.server.core;

public class Participant {

	private String participantPrivatetId; // ID to identify the user on server (org.kurento.jsonrpc.Session.id)
	private String participantPublicId; // ID to identify the user on clients
	private String clientMetadata = ""; // Metadata provided on client side
	private String serverMetadata = ""; // Metadata provided on server side
	private Token token; // Token associated to this participant

	protected boolean audioActive = true;
	protected boolean videoActive = true;
	protected String typeOfVideo; // CAMERA, SCREEN
	protected int frameRate;

	protected boolean streaming = false;
	protected volatile boolean closed;

	private final String METADATA_SEPARATOR = "%/%";

	public Participant(String participantPrivatetId, String participantPublicId, Token token, String clientMetadata) {
		this.participantPrivatetId = participantPrivatetId;
		this.participantPublicId = participantPublicId;
		this.token = token;
		this.clientMetadata = clientMetadata;
		if (!token.getServerMetadata().isEmpty())
			this.serverMetadata = token.getServerMetadata();
	}

	public String getParticipantPrivateId() {
		return participantPrivatetId;
	}

	public void setParticipantPrivateId(String participantPrivateId) {
		this.participantPrivatetId = participantPrivateId;
	}

	public String getParticipantPublicId() {
		return participantPublicId;
	}

	public void setParticipantPublicId(String participantPublicId) {
		this.participantPublicId = participantPublicId;
	}

	public String getClientMetadata() {
		return clientMetadata;
	}

	public void setClientMetadata(String clientMetadata) {
		this.clientMetadata = clientMetadata;
	}

	public String getServerMetadata() {
		return serverMetadata;
	}

	public void setServerMetadata(String serverMetadata) {
		this.serverMetadata = serverMetadata;
	}

	public Token getToken() {
		return this.token;
	}

	public void setToken(Token token) {
		this.token = token;
	}

	public boolean isStreaming() {
		return streaming;
	}

	public boolean isClosed() {
		return closed;
	}

	public void setStreaming(boolean streaming) {
		this.streaming = streaming;
	}

	public boolean isAudioActive() {
		return audioActive;
	}

	public void setAudioActive(boolean active) {
		this.audioActive = active;
	}

	public boolean isVideoActive() {
		return videoActive;
	}

	public void setVideoActive(boolean active) {
		this.videoActive = active;
	}

	public String getTypeOfVideo() {
		return this.typeOfVideo;
	}

	public void setTypeOfVideo(String typeOfVideo) {
		this.typeOfVideo = typeOfVideo;
	}
	
	public int getFrameRate() {
		return this.frameRate;
	}

	public void setFrameRate(int frameRate) {
		this.frameRate = frameRate;
	}

	public String getFullMetadata() {
		String fullMetadata;
		if ((!this.clientMetadata.isEmpty()) && (!this.serverMetadata.isEmpty())) {
			fullMetadata = this.clientMetadata + METADATA_SEPARATOR + this.serverMetadata;
		} else {
			fullMetadata = this.clientMetadata + this.serverMetadata;
		}
		return fullMetadata;
	}

	@Override
	public int hashCode() {
		final int prime = 31;
		int result = 1;
		result = prime * result + (participantPrivatetId == null ? 0 : participantPrivatetId.hashCode());
		result = prime * result + (streaming ? 1231 : 1237);
		result = prime * result + (participantPublicId == null ? 0 : participantPublicId.hashCode());
		return result;
	}

	@Override
	public boolean equals(Object obj) {
		if (this == obj) {
			return true;
		}
		if (obj == null) {
			return false;
		}
		if (!(obj instanceof Participant)) {
			return false;
		}
		Participant other = (Participant) obj;
		if (participantPrivatetId == null) {
			if (other.participantPrivatetId != null) {
				return false;
			}
		} else if (!participantPrivatetId.equals(other.participantPrivatetId)) {
			return false;
		}
		if (streaming != other.streaming) {
			return false;
		}
		if (participantPublicId == null) {
			if (other.participantPublicId != null) {
				return false;
			}
		} else if (!participantPublicId.equals(other.participantPublicId)) {
			return false;
		}
		return true;
	}

	@Override
	public String toString() {
		StringBuilder builder = new StringBuilder();
		builder.append("[");
		if (participantPrivatetId != null) {
			builder.append("participantPrivateId=").append(participantPrivatetId).append(", ");
		}
		if (participantPublicId != null) {
			builder.append("participantPublicId=").append(participantPublicId).append(", ");
		}
		builder.append("streaming=").append(streaming).append("]");
		return builder.toString();
	}

}
