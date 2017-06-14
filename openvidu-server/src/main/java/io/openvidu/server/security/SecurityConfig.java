package io.openvidu.server.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.authentication.configuration.EnableGlobalAuthentication;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.config.http.SessionCreationPolicy;

@Configuration
@EnableGlobalAuthentication
public class SecurityConfig extends WebSecurityConfigurerAdapter {
	
	@Autowired
	OpenviduConfiguration openviduConf;
	
	@Autowired
    public void configureGlobal(AuthenticationManagerBuilder auth) throws Exception {
        auth.inMemoryAuthentication()
          .withUser("OPENVIDUAPP").password(openviduConf.getOpenViduSecret()).roles("ADMIN");
    }
	
	@Override
	protected void configure(HttpSecurity http) throws Exception {

		configureUrlAuthorization(http);

		http.csrf().disable();

		// Use Http Basic Authentication
		http.httpBasic();
	}
 
    protected void configureUrlAuthorization(HttpSecurity http) throws Exception {
    	http.csrf().disable()
	        .authorizeRequests()
	        .antMatchers(HttpMethod.POST, "/api/sessions").authenticated()
	        .antMatchers(HttpMethod.POST, "/api/tokens").authenticated()
	        .antMatchers("/").authenticated()
	        .and().sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS);
    }

}