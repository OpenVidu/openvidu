package io.openvidu.java.client.test;

import static org.junit.Assert.assertThrows;

import java.util.Map;

import com.google.gson.Gson;
import com.google.gson.JsonObject;

import io.openvidu.java.client.ConnectionProperties;
import junit.framework.Test;
import junit.framework.TestCase;
import junit.framework.TestSuite;

public class ConnectionPropertiesTest extends TestCase {

	public ConnectionPropertiesTest(String testName) {
		super(testName);
	}

	public static Test suite() {
		return new TestSuite(ConnectionPropertiesTest.class);
	}

	public void testWebrtcFromJsonSuccess() {
		String jsonString = "{'type':'WEBRTC','data':'MY_CUSTOM_STRING','record':false,'role':'SUBSCRIBER','kurentoOptions':{'videoMaxRecvBandwidth':333,'videoMinRecvBandwidth':333,'videoMaxSendBandwidth':333,'videoMinSendBandwidth':333,'allowedFilters':['CustomFilter']},'customIceServers':[{'url':'turn:turn-domain.com:443','username':'MY_CUSTOM_STRING','credential':'MY_CUSTOM_STRING'}]}";
		JsonObject originalJson = new Gson().fromJson(jsonString, JsonObject.class);
		Map<String, ?> map = mapFromJsonString(jsonString);
		ConnectionProperties.Builder builder = ConnectionProperties.fromJson(map);
		ConnectionProperties props = builder.build();
		JsonObject finalJson = props.toJson("MY_CUSTOM_STRING");
		finalJson = removeIpcamProps(finalJson);
		assertEquals(originalJson, finalJson);
	}

	public void testIpcamFromJsonSuccess() {
		String jsonString = "{'type':'IPCAM','data':'MY_CUSTOM_STRING','record':false,'rtspUri':'rtsp://your.camera.ip.sdp','adaptativeBitrate':false,'onlyPlayWithSubscribers':false,'networkCache':333}";
		JsonObject originalJson = new Gson().fromJson(jsonString, JsonObject.class);
		Map<String, ?> map = mapFromJsonString(jsonString);
		ConnectionProperties.Builder builder = ConnectionProperties.fromJson(map);
		ConnectionProperties props = builder.build();
		JsonObject finalJson = props.toJson("MY_CUSTOM_STRING");
		finalJson = removeWebrtcProps(finalJson);
		assertEquals(originalJson, finalJson);

		jsonString = "{'type':'IPCAM','rtspUri':'rtsp://your.camera.ip.sdp'}";
		ConnectionProperties.fromJson(mapFromJsonString(jsonString)).build();

		jsonString = "{'type':'IPCAM','rtspUri':'rtsps://your.camera.ip.sdp'}";
		ConnectionProperties.fromJson(mapFromJsonString(jsonString)).build();

		jsonString = "{'type':'IPCAM','rtspUri':'file://your.camera.ip.sdp'}";
		ConnectionProperties.fromJson(mapFromJsonString(jsonString)).build();
	}

	public void testFromJsonError() {
		Map<String, ?> map = mapFromJsonString("{'type':'NOT_EXISTS'}");
		assertException(map, "type");

		map = mapFromJsonString("{'data':4000}");
		assertException(map, "");

		map = mapFromJsonString("{'record':4000}");
		assertException(map, "record");

		map = mapFromJsonString("{'role':'NOT_EXISTS'}");
		assertException(map, "role");

		map = mapFromJsonString("{'kurentoOptions':{'allowedFilters':[{'OBJECT_NOT_EXPECTED':true}]}}");
		assertException(map, "kurentoOptions");

		map = mapFromJsonString("{'customIceServers':[{'url':'NOT_A_VALID_URI'}]}");
		assertException(map, "customIceServers");

		map = mapFromJsonString("{'type':'IPCAM','rtspUri':'NOT_A_VALID_RTSP_URI'}");
		assertException(map, "rtspUri");

		map = mapFromJsonString("{'type':'IPCAM','rtspUri':'https://domain.com'}");
		assertException(map, "rtspUri");

		map = mapFromJsonString("{'type':'IPCAM','rtspUri':'filse://your.camera.ip.sdp'}");
		assertException(map, "rtspUri");
	}

	private JsonObject removeIpcamProps(JsonObject json) {
		json.remove("session");
		json.remove("adaptativeBitrate");
		json.remove("networkCache");
		json.remove("onlyPlayWithSubscribers");
		json.remove("rtspUri");
		return json;
	}

	private JsonObject removeWebrtcProps(JsonObject json) {
		json.remove("session");
		json.remove("kurentoOptions");
		json.remove("role");
		json.remove("customIceServers");
		return json;
	}

	private Map<String, ?> mapFromJsonString(String json) {
		return new Gson().fromJson(json, Map.class);
	}

	private void assertException(Map<String, ?> params, String containsError) {
		IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
				() -> ConnectionProperties.fromJson(params));
		assertTrue(exception.getMessage().contains(containsError));
	}
}
