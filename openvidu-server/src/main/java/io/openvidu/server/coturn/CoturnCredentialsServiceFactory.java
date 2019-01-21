/*
 * (C) Copyright 2017-2019 OpenVidu (https://openvidu.io/)
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

package io.openvidu.server.coturn;

import io.openvidu.server.config.OpenviduConfig;

public class CoturnCredentialsServiceFactory {

	OpenviduConfig openviduConfig;

	public CoturnCredentialsServiceFactory(OpenviduConfig openviduConfig) {
		this.openviduConfig = openviduConfig;
	}

	public CoturnCredentialsService getCoturnCredentialsService() {
		if (!"docker".equals(openviduConfig.getSpringProfile())) {
			return new BashCoturnCredentialsService(this.openviduConfig);
		} else {
			// TODO: return other options
			return new BashCoturnCredentialsService(this.openviduConfig);
		}
	}

}
