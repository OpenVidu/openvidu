package org.openvidu.client;

public class TokenOptions {
	
	private String data;
	private OpenViduRole role;
	
	public static class Builder {
		
		private String data = "";
		private OpenViduRole role = OpenViduRole.PUBLISHER;
		
		public TokenOptions build() {
			return new TokenOptions(this.data, this.role);
		}
		
		public Builder data(String data){
			this.data = data;
			return this;
		}
		
		public Builder role(OpenViduRole role){
			this.role = role;
			return this;
		}
		
	}
	
	public TokenOptions(String data, OpenViduRole role){
		this.data = data;
		this.role = role;
	}
	
	public String getData() {
		return this.data;
	}
	
	public OpenViduRole getRole() {
		return this.role;
	}

}
