package io.openvidu.server.core;

public class Token {

	String token;
	ParticipantRole role;
	String serverMetadata = "";

	public Token(String token) {
		this.token = token;
	}

	public Token(String token, ParticipantRole role, String serverMetadata) {
		this.token = token;
		this.role = role;
		this.serverMetadata = serverMetadata;
	}

	public String getToken() {
		return token;
	}

	public ParticipantRole getRole() {
		return role;
	}
	
	public String getServerMetadata() {
		return serverMetadata;
	}

	@Override
	public String toString() {
		if (this.role != null)
			return this.role.name();
		else
			return this.token;
	}

}