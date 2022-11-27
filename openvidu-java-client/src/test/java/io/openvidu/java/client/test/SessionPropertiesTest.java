package io.openvidu.java.client.test;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import com.google.gson.Gson;
import com.google.gson.JsonObject;

import io.openvidu.java.client.SessionProperties;

public class SessionPropertiesTest {

	@Test
	public void testFromJsonSuccess() {
		String jsonString = "{'customSessionId':'MY_CUSTOM_STRING','mediaMode':'ROUTED','recordingMode':'ALWAYS','defaultRecordingProperties':{'name':'MY_CUSTOM_STRING','hasAudio':false,'hasVideo':true,'outputMode':'COMPOSED_QUICK_START','recordingLayout':'BEST_FIT','resolution':'1920x1000','frameRate':25,'shmSize':536870911},'forcedVideoCodec':'VP8','allowTranscoding':true,'mediaNode':{'id':'MY_CUSTOM_STRING'}}";
		JsonObject originalJson = new Gson().fromJson(jsonString, JsonObject.class);
		Map<String, ?> map = mapFromJsonString(jsonString);
		SessionProperties.Builder builder = SessionProperties.fromJson(map);
		SessionProperties props = builder.build();
		JsonObject finalJson = props.toJson();
		Assertions.assertEquals(originalJson, finalJson);
	}

	@Test
	public void testFromJsonError() {
		Map<String, ?> map = mapFromJsonString("{'mediaNode':'MY_CUSTOM_STRING'}");
		assertException(map, "Error in parameter 'mediaNode'");

		map = mapFromJsonString("{'customSessionId':'WRONG_CUSTOM_SESSION_ID?'}");
		assertException(map, "Parameter 'customSessionId' is wrong");

//		map = mapFromJsonString("{'defaultRecordingProperties':{'resolution':'2000x1000'}}");
//		assertException(map, "Parameter 'customSessionId' is wrong");
	}

	private Map<String, ?> mapFromJsonString(String json) {
		return new Gson().fromJson(json, Map.class);
	}

	private void assertException(Map<String, ?> params, String containsError) {
		IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
				() -> SessionProperties.fromJson(params));
		assertTrue(exception.getMessage().contains(containsError));
	}
}
