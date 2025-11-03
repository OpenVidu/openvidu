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

package io.openvidu.server.config;

import java.util.Arrays;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import io.openvidu.server.rest.RequestMappings;

@Configuration()
@ConditionalOnMissingBean(name = "securityConfigPro")
@Order(Ordered.LOWEST_PRECEDENCE)
public class SecurityConfig {

	@Autowired
	protected OpenviduConfig openviduConf;

	@Autowired
	protected Environment environment;

	@Bean
	public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
		// Configure CORS and CSRF
		configureHttpSecurity(http);
		
		// Configure authorization rules
		configureAuthorization(http);
		
		// Configure HTTP Basic authentication
		http.httpBasic(httpBasic -> {});

		return http.build();
	}

	/**
	 * Configure CORS and CSRF settings. Can be overridden by subclasses.
	 */
	protected void configureHttpSecurity(HttpSecurity http) throws Exception {
		http.cors(cors -> {})  // Uses below CorsFilter bean
			.csrf(csrf -> csrf.disable());
	}

	/**
	 * Configure authorization rules for CE. Can be extended by PRO subclass.
	 */
	protected void configureAuthorization(HttpSecurity http) throws Exception {
		http.authorizeHttpRequests(auth -> {
			configurePublicEndpoints(auth);
			configureProtectedEndpoints(auth);
			configureWebSocketEndpoints(auth);
		});
	}

	/**
	 * Configure public endpoints. Can be overridden by subclasses.
	 */
	protected void configurePublicEndpoints(org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer<?>.AuthorizationManagerRequestMatcherRegistry auth) {
		// Public endpoints
		auth.requestMatchers(HttpMethod.GET, RequestMappings.API + "/config/openvidu-publicurl").permitAll()
			.requestMatchers(HttpMethod.GET, RequestMappings.ACCEPT_CERTIFICATE).permitAll();
		
		// Secure recordings depending on OPENVIDU_RECORDING_PUBLIC_ACCESS
		if (openviduConf.getOpenViduRecordingPublicAccess()) {
			auth.requestMatchers(HttpMethod.GET, RequestMappings.RECORDINGS + "/**").permitAll();
		} else {
			auth.requestMatchers(HttpMethod.GET, RequestMappings.RECORDINGS + "/**").hasRole("ADMIN");
		}
	}

	/**
	 * Configure protected API endpoints. Can be extended by subclasses.
	 */
	protected void configureProtectedEndpoints(org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer<?>.AuthorizationManagerRequestMatcherRegistry auth) {
		// Protected API endpoints (must come before WebSocket to take precedence)
		auth.requestMatchers(RequestMappings.API + "/**").hasRole("ADMIN")
			.requestMatchers(HttpMethod.GET, RequestMappings.CDR + "/**").hasRole("ADMIN")
			.requestMatchers(HttpMethod.GET, RequestMappings.FRONTEND_CE + "/**").hasRole("ADMIN")
			.requestMatchers(HttpMethod.GET, RequestMappings.CUSTOM_LAYOUTS + "/**").hasRole("ADMIN");
	}

	/**
	 * Configure WebSocket endpoints. Should be called last to avoid interfering with more specific rules.
	 */
	protected void configureWebSocketEndpoints(org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer<?>.AuthorizationManagerRequestMatcherRegistry auth) {
		// WebSocket endpoints: allow without authentication
		auth.requestMatchers("/openvidu", "/openvidu/info").permitAll();
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