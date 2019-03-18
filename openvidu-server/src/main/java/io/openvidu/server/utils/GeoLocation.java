package io.openvidu.server.utils;

public class GeoLocation {

	private String country;
	private String city;
	private String timezone;
	private Double latitude;
	private Double longitude;

	public GeoLocation(String country, String city, String timezone, Double latitude, Double longitude) {
		super();
		this.country = country;
		this.city = city;
		this.timezone = timezone;
		this.latitude = latitude;
		this.longitude = longitude;
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
		return this.city + ", " + this.country;
	}

}
