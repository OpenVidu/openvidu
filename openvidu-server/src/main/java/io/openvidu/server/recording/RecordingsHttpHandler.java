package io.openvidu.server.recording;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurerAdapter;

import io.openvidu.server.config.OpenviduConfig;

@Configuration
public class RecordingsHttpHandler extends WebMvcConfigurerAdapter {

	@Autowired
	OpenviduConfig openviduConfig;

	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry) {

		String recordingsPath = openviduConfig.getOpenViduRecordingPath();
		recordingsPath = recordingsPath.endsWith("/") ? recordingsPath : recordingsPath + "/";

		openviduConfig.setOpenViduRecordingPath(recordingsPath);

		registry.addResourceHandler("/recordings/**").addResourceLocations("file:" + recordingsPath);
	}

}
