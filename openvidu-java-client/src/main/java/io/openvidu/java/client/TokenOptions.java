/*
 * (C) Copyright 2017-2018 OpenVidu (http://openvidu.io/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

package io.openvidu.java.client;

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
	
	private TokenOptions(String data, OpenViduRole role){
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
