/*
 * (C) Copyright 2017-2022 OpenVidu (https://openvidu.io)
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

package io.openvidu.server.rest;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import com.google.gson.JsonArray;

import io.openvidu.server.config.OpenviduConfig;

/**
 *
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 */
@RestController
@CrossOrigin
@RequestMapping(RequestMappings.CDR)
public class CDRRestController {

	private static final Logger log = LoggerFactory.getLogger(CDRRestController.class);

	@Autowired
	protected OpenviduConfig openviduConfig;

	@RequestMapping(method = RequestMethod.GET)
	public ResponseEntity<String> listCdrFiles() {

		log.info("REST API: GET {}", RequestMappings.CDR);

		String cdrPath = openviduConfig.getOpenviduCdrPath();
		JsonArray cdrFiles = new JsonArray();

		try (Stream<Path> walk = Files.walk(Paths.get(cdrPath))) {
			List<String> result = walk.filter(Files::isRegularFile).map(x -> x.getFileName().toString())
					.collect(Collectors.toList());
			result.forEach(fileName -> cdrFiles.add(fileName));
		} catch (IOException e) {
			log.error("Error listing CDR files in path {}: {}", cdrPath, e.getMessage());
		}

		HttpHeaders responseHeaders = new HttpHeaders();
		responseHeaders.setContentType(MediaType.APPLICATION_JSON);
		return new ResponseEntity<>(cdrFiles.toString(), responseHeaders, HttpStatus.OK);
	}

}
