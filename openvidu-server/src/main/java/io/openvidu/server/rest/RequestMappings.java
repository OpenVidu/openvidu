package io.openvidu.server.rest;

public class RequestMappings {

	// WebSocket
	final public static String WS_RPC = "/openvidu";
	final public static String WS_INFO = "/openvidu/info";
	// REST API
	final public static String API = "/openvidu/api";
	final public static String CDR = "/openvidu/cdr";
	final public static String API_ELK = "/openvidu/elk";
	final public static String API_INSPECTOR = "/openvidu/inspector-api";
	final public static String API_MULTI_MASTER = "/openvidu/multi-master";
	// Static resources
	final public static String RECORDINGS = "/openvidu/recordings";
	final public static String CUSTOM_LAYOUTS = "/openvidu/layouts";
	final public static String VIRTUAL_BACKGROUND = "/openvidu/virtual-background";
	final public static String FRONTEND_CE = "/dashboard";
	final public static String FRONTEND_PRO = "/inspector";

	final public static String ACCEPT_CERTIFICATE = "/openvidu/accept-certificate"; // ????

}
