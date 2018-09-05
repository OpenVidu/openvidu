package io.openvidu.server.utils;

import java.io.IOException;
import java.io.InputStream;
import java.net.InetAddress;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import javax.inject.Inject;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import com.maxmind.db.Reader;
import com.maxmind.geoip2.DatabaseReader;
import com.maxmind.geoip2.exception.GeoIp2Exception;
import com.maxmind.geoip2.model.CityResponse;

/**
 * This product includes GeoLite2 data created by MaxMind, available from
 * <a href="http://www.maxmind.com">http://www.maxmind.com</a>.
 */

@Service("geolocationservice")
public class GeoLocationByIpUtils {

	private static final Logger log = LoggerFactory.getLogger(GeoLocationByIpUtils.class);

	private static DatabaseReader reader = null;
	private ResourceLoader resourceLoader;

	@Inject
	public GeoLocationByIpUtils(ResourceLoader resourceLoader) {
		this.resourceLoader = resourceLoader;
	}

	@PostConstruct
	public void init() {
		try {
			log.info("Trying to load GeoLite2-City database...");
			Resource resource = resourceLoader.getResource("classpath:GeoLite2-City.mmdb");
			InputStream dbAsStream = resource.getInputStream();
			// Initialize the reader
			reader = new DatabaseReader.Builder(dbAsStream).fileMode(Reader.FileMode.MEMORY).build();
			log.info("Database was loaded successfully");
		} catch (IOException | NullPointerException e) {
			log.error("Database reader cound not be initialized", e);
		}
	}

	@PreDestroy
	public void preDestroy() {
		if (reader != null) {
			try {
				reader.close();
			} catch (IOException e) {
				log.error("Failed to close the GeoLocation reader");
			}
		}
	}

	public String getLocationByIp(InetAddress ipAddress) throws IOException, GeoIp2Exception {
		CityResponse response = reader.city(ipAddress);
		return response.getCity().getNames().get("en") + ", " + response.getCountry().getNames().get("en");
	}
}
