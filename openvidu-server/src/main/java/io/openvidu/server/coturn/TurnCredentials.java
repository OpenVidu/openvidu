package io.openvidu.server.coturn;

public class TurnCredentials {

	private String username;
	private String credential;

	public TurnCredentials(String username, String credential) {
		this.username = username;
		this.credential = credential;
	}

	public String getUsername() {
		return username;
	}

	public String getCredential() {
		return credential;
	}

}
