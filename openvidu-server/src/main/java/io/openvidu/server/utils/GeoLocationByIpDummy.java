package io.openvidu.server.utils;

import java.net.InetAddress;

public class GeoLocationByIpDummy implements GeoLocationByIp {

	@Override
	public GeoLocation getLocationByIp(InetAddress ipAddress) throws Exception {
		return new GeoLocation(ipAddress.getHostAddress());
	}

}
