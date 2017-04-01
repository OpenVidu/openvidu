/*
 * (C) Copyright 2014 Kurento (http://kurento.org/)
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
 */

package org.openvidu.server.security;

import org.kurento.client.MediaPipeline;
import org.openvidu.client.OpenViduException;
import org.openvidu.client.OpenViduException.Code;
import org.openvidu.server.core.internal.Participant;
import org.openvidu.server.core.internal.Room;

public class ParticipantSecurity extends Participant{
	
	ParticipantRoles role;

	public ParticipantSecurity(String id, String name, String role, Room room, MediaPipeline pipeline, boolean dataChannels,
			boolean web) {
		super(id, name, room, pipeline, dataChannels, web);
		
		this.role = ParticipantRoles.valueOf(role);
	}
	
	@Override
	public void createPublishingEndpoint() {
		if (this.isPublisher()){
			super.createPublishingEndpoint();
		} else {
			throw new OpenViduException(Code.USER_UNAUTHORIZED,
			          "Unable to create publisher endpoint");
		}
	}
	
	private boolean isPublisher(){
		return (this.role.equals(ParticipantRoles.PUBLISHER) ||
				this.role.equals(ParticipantRoles.MODERATOR));
	}
  
}
