package io.openvidu.server.recording;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurerAdapter;

import io.openvidu.server.config.OpenviduConfig;

@Configuration
public class LayoutsHttpHandler extends WebMvcConfigurerAdapter {

	@Autowired
	OpenviduConfig openviduConfig;

	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry) {

		String customLayoutsPath = openviduConfig.getOpenviduRecordingCustomLayout();
		customLayoutsPath = customLayoutsPath.endsWith("/") ? customLayoutsPath : customLayoutsPath + "/";

		openviduConfig.setOpenViduRecordingCustomLayout(customLayoutsPath);

		registry.addResourceHandler("/layouts/custom/**").addResourceLocations("file:" + customLayoutsPath);
	}

}