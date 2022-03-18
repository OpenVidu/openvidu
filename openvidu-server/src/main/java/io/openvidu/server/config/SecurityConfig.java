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
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.config.annotation.web.configurers.ExpressionUrlAuthorizationConfigurer;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import io.openvidu.server.rest.ApiRestPathRewriteFilter;
import io.openvidu.server.rest.RequestMappings;

@Configuration()
@ConditionalOnMissingBean(name = "securityConfigPro")
@Order(Ordered.LOWEST_PRECEDENCE)
public class SecurityConfig extends WebSecurityConfigurerAdapter {

	@Autowired
	protected OpenviduConfig openviduConf;

	@Autowired
	protected Environment environment;

	@Override
	protected void configure(HttpSecurity http) throws Exception {

		ExpressionUrlAuthorizationConfigurer<HttpSecurity>.ExpressionInterceptUrlRegistry conf = http.cors().and()
				.csrf().disable().authorizeRequests()
				.antMatchers(HttpMethod.GET, RequestMappings.API + "/config/openvidu-publicurl").permitAll()
				.antMatchers(HttpMethod.GET, RequestMappings.ACCEPT_CERTIFICATE).permitAll()
				.antMatchers(RequestMappings.API + "/**").hasRole("ADMIN")
				.antMatchers(HttpMethod.GET, RequestMappings.CDR + "/**").hasRole("ADMIN")
				.antMatchers(HttpMethod.GET, RequestMappings.FRONTEND_CE + "/**").hasRole("ADMIN")
				.antMatchers(HttpMethod.GET, RequestMappings.CUSTOM_LAYOUTS + "/**").hasRole("ADMIN");

		// Secure recordings depending on OPENVIDU_RECORDING_PUBLIC_ACCESS
		if (openviduConf.getOpenViduRecordingPublicAccess()) {
			conf = conf.antMatchers(HttpMethod.GET, RequestMappings.RECORDINGS + "/**").permitAll();
		} else {
			conf = conf.antMatchers(HttpMethod.GET, RequestMappings.RECORDINGS + "/**").hasRole("ADMIN");
		}

		conf.and().httpBasic();

		// TODO: remove this when deprecating SUPPORT_DEPRECATED_API
		if (Boolean.valueOf(environment.getProperty("SUPPORT_DEPRECATED_API"))) {
			ApiRestPathRewriteFilter.protectOldPathsCe(conf, openviduConf);
		}
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