package io.openvidu.server.utils;

import java.net.InetAddress;

import org.springframework.stereotype.Service;

@Service
public class GeoLocationByIpDummy implements GeoLocationByIp {

	public String getLocationByIp(InetAddress ipAddress) throws Exception {
		return "";
	}

}
