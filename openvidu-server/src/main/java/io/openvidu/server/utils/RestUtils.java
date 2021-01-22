package io.openvidu.server.utils;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

public class RestUtils {

	private static final Logger log = LoggerFactory.getLogger(RestUtils.class);

	public static HttpHeaders getResponseHeaders() {
		HttpHeaders responseHeaders = new HttpHeaders();
		responseHeaders.setContentType(MediaType.APPLICATION_JSON);
		return responseHeaders;
	}

	public static ResponseEntity<String> getErrorResponse(String message, HttpStatus status) {
		if (!status.is2xxSuccessful()) {
			log.error(message);
		}
		HttpHeaders responseHeaders = new HttpHeaders();
		responseHeaders.setContentType(MediaType.TEXT_PLAIN);
		return new ResponseEntity<>(message, responseHeaders, status);
	}

}
