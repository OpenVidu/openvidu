package org.openvidu.server.security;

public class Token {
	
	String token;
	ParticipantRole role;
	String serverMetadata;
	String clientMetadata ;
	
	public Token(String token) {
		this.token = token;
	}
	
	public Token(String token, ParticipantRole role, String metadata) {
		this.token = token;
		this.role = role;
		this.serverMetadata = metadata;
	}
	
	public String getServerMetadata() {
		return serverMetadata;
	}

	public void setServerMetadata(String serverMetadata) {
		this.serverMetadata = serverMetadata;
	}

	public String getClientMetadata() {
		return clientMetadata;
	}
	
	public void setClientMetadata(String metadata){
		this.clientMetadata = metadata;
	}

	public String getToken() {
		return token;
	}
	
	public ParticipantRole getRole() {
		return role;
	}
	
	@Override
	public String toString(){
		if (this.role != null)
			return this.role.name();
		else
			return this.token;
	}
	
}
