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
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import io.openvidu.server.rest.ApiRestPathRewriteFilter;
import io.openvidu.server.rest.RequestMappings;

@Configuration
@Order(Ordered.LOWEST_PRECEDENCE)
public class SecurityConfig {

	@Autowired
	protected OpenviduConfig openviduConf;

	@Autowired
	protected Environment environment;

	@Bean
	@ConditionalOnMissingBean(name = "securityConfigPro")
	public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
		return buildFilterChain(http);
	}

	protected SecurityFilterChain buildFilterChain(HttpSecurity http) throws Exception {
		configureHttpSecurity(http);
		applyHeaders(http);
		configureAuthorization(http);
		configureHttpBasic(http);
		return http.build();
	}

	protected void configureHttpSecurity(HttpSecurity http) throws Exception {
		http.cors(cors -> {
			// Rely on bean defined below
		}).csrf(csrf -> csrf.disable());
	}

	protected void applyHeaders(HttpSecurity http) throws Exception {
		// Default CE configuration does not customize headers
	}

	protected void configureAuthorization(HttpSecurity http) throws Exception {
		http.authorizeHttpRequests(auth -> configureAuthorizationRules(auth));
	}

	protected void configureAuthorizationRules(AuthorizeHttpRequestsConfigurer<?>.AuthorizationManagerRequestMatcherRegistry auth) {
		configurePublicEndpoints(auth);
		configureProtectedEndpoints(auth);
		configureWebSocketEndpoints(auth);
		configureDeprecatedApiEndpoints(auth);
	}

	protected void configurePublicEndpoints(AuthorizeHttpRequestsConfigurer<?>.AuthorizationManagerRequestMatcherRegistry auth) {
		auth.requestMatchers(HttpMethod.GET, RequestMappings.API + "/config/openvidu-publicurl").permitAll()
			.requestMatchers(HttpMethod.HEAD, RequestMappings.API + "/config/openvidu-publicurl").permitAll()
			.requestMatchers(HttpMethod.GET, RequestMappings.ACCEPT_CERTIFICATE).permitAll();

		if (openviduConf.getOpenViduRecordingPublicAccess()) {
			auth.requestMatchers(HttpMethod.GET, RequestMappings.RECORDINGS + "/**").permitAll();
		} else {
			auth.requestMatchers(HttpMethod.GET, RequestMappings.RECORDINGS + "/**").hasRole("ADMIN");
		}
	}

	protected void configureProtectedEndpoints(AuthorizeHttpRequestsConfigurer<?>.AuthorizationManagerRequestMatcherRegistry auth) {
		auth.requestMatchers(RequestMappings.API + "/**").hasRole("ADMIN")
			.requestMatchers(HttpMethod.GET, RequestMappings.CDR + "/**").hasRole("ADMIN")
			.requestMatchers(HttpMethod.GET, RequestMappings.FRONTEND_CE + "/**").hasRole("ADMIN")
			.requestMatchers(HttpMethod.GET, RequestMappings.CUSTOM_LAYOUTS + "/**").hasRole("ADMIN");
	}

	protected void configureWebSocketEndpoints(AuthorizeHttpRequestsConfigurer<?>.AuthorizationManagerRequestMatcherRegistry auth) {
		auth.requestMatchers(RequestMappings.WS_RPC, RequestMappings.WS_INFO).permitAll();
	}

	protected void configureDeprecatedApiEndpoints(AuthorizeHttpRequestsConfigurer<?>.AuthorizationManagerRequestMatcherRegistry auth) {
		if (Boolean.valueOf(environment.getProperty("SUPPORT_DEPRECATED_API"))) {
			try {
				ApiRestPathRewriteFilter.protectOldPathsCe(auth, openviduConf);
			} catch (Exception exception) {
				throw new RuntimeException(exception);
			}
		}
	}

	protected void configureHttpBasic(HttpSecurity http) throws Exception {
		http.httpBasic(Customizer.withDefaults());
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