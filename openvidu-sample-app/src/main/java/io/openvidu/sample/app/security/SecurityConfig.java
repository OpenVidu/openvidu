package io.openvidu.sample.app.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;

/**
 * Security configuration. In this class several aspects
 * related to security can be configured:
 * Security behavior: Login method, session management, CSRF, etc..
 * Authentication provider: Responsible to authenticate users. In this
 * example, we use an instance of UserRepositoryAuthProvider, that authenticate
 * users stored in a Spring Data database.
 * URL Access Authorization: Access to http URLs depending on Authenticated
 * vs anonymous users and also based on user role.
 * 
 * 
 * NOTE: The only part of this class intended for app developer customization is
 * the method configureUrlAuthorization. App developer should
 * decide what URLs are accessible by what user role.
 */
@Configuration
public class SecurityConfig extends WebSecurityConfigurerAdapter {

	@Autowired
	public UserRepositoryAuthProvider userRepoAuthProvider;

	@Override
	protected void configure(HttpSecurity http) throws Exception {

		configureUrlAuthorization(http);

		// Disable CSRF protection (it is difficult to implement with ng2)
		http.csrf().disable();

		// Use Http Basic Authentication
		http.httpBasic();

		// Do not redirect when logout
		http.logout().logoutSuccessHandler((rq, rs, a) -> {
		});
	}

	private void configureUrlAuthorization(HttpSecurity http) throws Exception {

		// APP: This rules have to be changed by app developer

		// URLs that need authentication to access to it
		//Lessons API
		http.authorizeRequests().antMatchers(HttpMethod.GET, "/api-lessons/**").hasAnyRole("TEACHER", "STUDENT");
		http.authorizeRequests().antMatchers(HttpMethod.POST, "/api-lessons/**").hasRole("TEACHER");
		http.authorizeRequests().antMatchers(HttpMethod.PUT, "/api-lessons/**").hasRole("TEACHER");
		http.authorizeRequests().antMatchers(HttpMethod.DELETE, "/api-lessons/**").hasRole("TEACHER");
		
		http.authorizeRequests().antMatchers(HttpMethod.POST, "/api-sessions/**").authenticated();
		
		// Other URLs can be accessed without authentication
		http.authorizeRequests().anyRequest().permitAll();
	}

	@Override
	protected void configure(AuthenticationManagerBuilder auth) throws Exception {

		// Database authentication provider
		auth.authenticationProvider(userRepoAuthProvider);
	}
}