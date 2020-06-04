/*
 * (C) Copyright 2017-2020 OpenVidu (https://openvidu.io)
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

import javax.annotation.PostConstruct;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import io.openvidu.server.config.OpenviduConfig;

public abstract class CoturnCredentialsService {

	protected static final Logger log = LoggerFactory.getLogger(CoturnCredentialsService.class);

	@Autowired
	protected OpenviduConfig openviduConfig;

	protected String coturnDatabaseString;
	protected String trimmedCoturnDatabaseString;

	public abstract TurnCredentials createUser() throws Exception;

	public abstract boolean deleteUser(String user);

	@PostConstruct
	protected void initDatabse() {
		this.coturnDatabaseString = this.openviduConfig.getCoturnDatabaseString();
		this.trimmedCoturnDatabaseString = this.coturnDatabaseString.replaceAll("^\"|\"$", "");
	}

}
