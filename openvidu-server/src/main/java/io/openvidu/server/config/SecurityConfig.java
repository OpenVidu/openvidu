/*
 * (C) Copyright 2017-2020 OpenVidu (https://openvidu.io)
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

package io.openvidu.server.config;

import java.util.Arrays;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.config.annotation.web.configurers.ExpressionUrlAuthorizationConfigurer;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration
public class SecurityConfig extends WebSecurityConfigurerAdapter {

	@Autowired
	OpenviduConfig openviduConf;

	@Override
	protected void configure(HttpSecurity http) throws Exception {

		// Security for API REST
		ExpressionUrlAuthorizationConfigurer<HttpSecurity>.ExpressionInterceptUrlRegistry conf = http.cors().and()
				.csrf().disable().authorizeRequests()
				// /api
				.antMatchers("/api/**").authenticated()
				// /config
				.antMatchers(HttpMethod.GET, "/config/openvidu-publicurl").permitAll()
				.antMatchers(HttpMethod.GET, "/config/**").authenticated()
				// /cdr
				.antMatchers(HttpMethod.GET, "/cdr/**").authenticated()
				// /accept-certificate
				.antMatchers(HttpMethod.GET, "/accept-certificate").permitAll()
				// Dashboard
				.antMatchers(HttpMethod.GET, "/dashboard/**").authenticated();

		// Security for recording layouts
		conf.antMatchers("/layouts/**").authenticated();

		// Security for recorded video files
		if (openviduConf.getOpenViduRecordingPublicAccess()) {
			conf = conf.antMatchers("/recordings/**").permitAll();
		} else {
			conf = conf.antMatchers("/recordings/**").authenticated();
		}

		conf.and().httpBasic();
	}

	@Bean
	public CorsFilter corsFilter() {
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		CorsConfiguration config = new CorsConfiguration();
		config.setAllowedOrigins(Arrays.asList("*"));
		config.setAllowedHeaders(Arrays.asList("*"));
		config.setAllowedMethods(Arrays.asList("*"));
		source.registerCorsConfiguration("/**", config);
		return new CorsFilter(source);
	}

	@Autowired
	public void configureGlobal(AuthenticationManagerBuilder auth) throws Exception {
		auth.inMemoryAuthentication().withUser("OPENVIDUAPP").password("{noop}" + openviduConf.getOpenViduSecret())
				.roles("ADMIN");
	}

}