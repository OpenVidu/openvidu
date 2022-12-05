/*
 * (C) Copyright 2017-2022 OpenVidu (https://openvidu.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

package io.openvidu.server.resources;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import io.openvidu.server.config.OpenviduConfig;

/**
 * This class changes the path where static files are served from / to
 * /NEW_FRONTEND_PATH. Entrypoint file index.html must have tag
 * <base href="/NEW_FRONTEND_PATH/">
 *
 * By default in OpenVidu CE this path is /dashboard and in OpenVidu Pro is
 * /inspector
 *
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 */
@Configuration
public class FrontendResourceHandler implements WebMvcConfigurer {

	@Autowired
	OpenviduConfig openviduConfig;

	@Override
	public void addViewControllers(ViewControllerRegistry registry) {
		registry.addViewController(openviduConfig.getOpenViduFrontendDefaultPath())
				.setViewName("redirect:" + openviduConfig.getOpenViduFrontendDefaultPath() + "/");
		registry.addViewController(openviduConfig.getOpenViduFrontendDefaultPath() + "/")
				.setViewName("forward:" + openviduConfig.getOpenViduFrontendDefaultPath() + "/index.html");
	}

}
