package io.openvidu.java.client.test;

import static org.junit.Assert.assertThrows;

import java.util.Map;

import com.google.gson.Gson;
import com.google.gson.JsonObject;

import io.openvidu.java.client.RecordingProperties;
import junit.framework.Test;
import junit.framework.TestCase;
import junit.framework.TestSuite;

public class RecordingPropertiesTest extends TestCase {

	public RecordingPropertiesTest(String testName) {
		super(testName);
	}

	public static Test suite() {
		return new TestSuite(RecordingPropertiesTest.class);
	}

	/**
	 * { "session":"ses_YnDaGYNcd7", "name": "MyRecording", "hasAudio": true,
	 * "hasVideo": true, "outputMode": "COMPOSED", "recordingLayout": "CUSTOM",
	 * "customLayout": "mySimpleLayout", "resolution": "1280x720", "frameRate": 25,
	 * "shmSize": 536870912, "ignoreFailedStreams": false, "mediaNode": { "id":
	 * "media_i-0c58bcdd26l11d0sd" } }
	 */

	public void testRecordingFromJsonSuccess() {
		String jsonString = "{'session':'MY_CUSTOM_STRING','name':'MY_CUSTOM_STRING','hasAudio':false,'hasVideo':true,'outputMode':'COMPOSED','recordingLayout':'CUSTOM','customLayout':'MY_CUSTOM_STRING','resolution':'1000x1000','frameRate':33,'shmSize':333333333,'mediaNode':{'id':'MY_CUSTOM_STRING'}}";
		Map<String, ?> map = mapFromJsonString(jsonString);
		RecordingProperties.Builder builder = RecordingProperties.fromJson(map, null);
		RecordingProperties props = builder.build();
		JsonObject finalJson = props.toJson();

		JsonObject originalJson = new Gson().fromJson(jsonString, JsonObject.class);
		originalJson = adaptProps(originalJson);

		assertEquals(originalJson, finalJson);

		jsonString = "{'session':'MY_CUSTOM_STRING','name':'MY_CUSTOM_STRING','hasAudio':false,'hasVideo':true,'outputMode':'INDIVIDUAL','ignoreFailedStreams':true}";
		map = mapFromJsonString(jsonString);
		builder = RecordingProperties.fromJson(map, null);
		props = builder.build();
		finalJson = props.toJson();

		originalJson = new Gson().fromJson(jsonString, JsonObject.class);
		originalJson = adaptProps(originalJson);

		assertEquals(originalJson, finalJson);
	}

	public void testFromJsonError() {
		Map<String, ?> map = mapFromJsonString("{'session':false}");
		assertException(map, "Type error in some parameter", IllegalArgumentException.class);

		map = mapFromJsonString("{'session':123}");
		assertException(map, "Type error in some parameter", IllegalArgumentException.class);

		map = mapFromJsonString("{'name':true}");
		assertException(map, "Type error in some parameter", IllegalArgumentException.class);

		map = mapFromJsonString("{'name':0}");
		assertException(map, "Type error in some parameter", IllegalArgumentException.class);

		map = mapFromJsonString("{'name':{'object':true}}");
		assertException(map, "Type error in some parameter", IllegalArgumentException.class);

		map = mapFromJsonString("{'name':[]}");
		assertException(map, "Type error in some parameter", IllegalArgumentException.class);

		map = mapFromJsonString("{'hasAudio':'str'}");
		assertException(map, "Type error in some parameter", IllegalArgumentException.class);

		map = mapFromJsonString("{'hasVideo':123}");
		assertException(map, "Type error in some parameter", IllegalArgumentException.class);

		map = mapFromJsonString("{'hasVideo':123}");
		assertException(map, "Type error in some parameter", IllegalArgumentException.class);

		map = mapFromJsonString("{'outputMode':false}");
		assertException(map, "Type error in some parameter", IllegalArgumentException.class);

		map = mapFromJsonString("{'recordingLayout':123}");
		assertException(map, "Type error in some parameter", IllegalArgumentException.class);

		map = mapFromJsonString("{'customLayout':{}}");
		assertException(map, "Type error in some parameter", IllegalArgumentException.class);

		map = mapFromJsonString("{'resolution':false}");
		assertException(map, "Type error in some parameter", IllegalArgumentException.class);

		map = mapFromJsonString("{'frameRate':'str'}");
		assertException(map, "Type error in some parameter", IllegalArgumentException.class);

		map = mapFromJsonString("{'shmSize':'str'}");
		assertException(map, "Type error in some parameter", IllegalArgumentException.class);

		map = mapFromJsonString("{'hasAudio':false,'hasVideo':false}");
		assertException(map, "Cannot start a recording with both \"hasAudio\" and \"hasVideo\" set to false",
				IllegalStateException.class);

		map = mapFromJsonString("{'resolution':'99x1000'}");
		assertException(map, "Wrong 'resolution' parameter", IllegalStateException.class);

		map = mapFromJsonString("{'frameRate':121}");
		assertException(map, "Wrong 'frameRate' parameter", IllegalStateException.class);

		map = mapFromJsonString("{'shmSize':134217727}");
		assertException(map, "Wrong 'shmSize' parameter", IllegalStateException.class);

		map = mapFromJsonString("{'mediaNode':true}");
		assertException(map, "Wrong 'mediaNode' parameter", IllegalArgumentException.class);

		map = mapFromJsonString("{'mediaNode':{}}");
		assertException(map, "Wrong 'mediaNode' parameter", IllegalArgumentException.class);

		map = mapFromJsonString("{'mediaNode':{'id':false}}");
		assertException(map, "Wrong 'mediaNode' parameter", IllegalArgumentException.class);
	}

	private JsonObject adaptProps(JsonObject json) {
		json.remove("session");
		if (json.has("mediaNode")) {
			json.addProperty("mediaNode", json.get("mediaNode").getAsJsonObject().get("id").getAsString());
		}
		return json;
	}

	private Map<String, ?> mapFromJsonString(String json) {
		return new Gson().fromJson(json, Map.class);
	}

	private <T extends Exception> void assertException(Map<String, ?> params, String containsError,
			Class<T> exceptionClass) {
		if (exceptionClass != null) {
			T exception = assertThrows(exceptionClass, () -> RecordingProperties.fromJson(params, null));
			assertTrue(exception.getMessage().contains(containsError));
		} else {
			Exception exception = assertThrows(RuntimeException.class,
					() -> RecordingProperties.fromJson(params, null));
			assertTrue(exception.getMessage().contains(containsError));
		}
	}

}
