package io.openvidu.server.utils;

public class GeoLocation {

	private String ip;
	private String country;
	private String city;
	private String timezone;
	private Double latitude;
	private Double longitude;

	public GeoLocation(String ip) {
		super();
		this.ip = ip;
	}

	public GeoLocation(String ip, String country, String city, String timezone, Double latitude, Double longitude) {
		super();
		this.ip = ip;
		this.country = country;
		this.city = city;
		this.timezone = timezone;
		this.latitude = latitude;
		this.longitude = longitude;
	}

	public String getIp() {
		return this.ip;
	}

	public String getCountry() {
		return country;
	}

	public String getCity() {
		return city;
	}

	public String getTimezone() {
		return timezone;
	}

	public Double getLatitude() {
		return latitude;
	}

	public Double getLongitude() {
		return longitude;
	}

	@Override
	public String toString() {
		if (this.country == null) {
			return "unknown";
		}
		String location = this.country;
		if (this.city != null) {
			location = this.city + ", " + location;
		}
		return location;
	}

}
