package org.openvidu.server.security;

public class Token {
	
	String token;
	ParticipantRole role;
	String serverMetadata;
	String clientMetadata ;
	
	public Token(String token, ParticipantRole role, String metadata) {
		this.token = token;
		this.role = role;
		this.serverMetadata = metadata;
	}

	public String getToken() {
		return token;
	}
	
	public ParticipantRole getRole() {
		return role;
	}
	
	public void setClientMetadata(String metadata){
		this.clientMetadata = metadata;
	}
	
	@Override
	public String toString(){
		return this.role.name();
	}
	
}
