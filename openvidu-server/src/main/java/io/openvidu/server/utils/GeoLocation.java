package io.openvidu.server.utils;

public class GeoLocation {

	private String country;
	private String city;
	private Double latitude;
	private Double longitude;

	public GeoLocation(String country, String city, Double latitude, Double longitude) {
		super();
		this.country = country;
		this.city = city;
		this.latitude = latitude;
		this.longitude = longitude;
	}

	public String getCountry() {
		return country;
	}

	public String getCity() {
		return city;
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
