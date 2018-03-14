package io.openvidu.server.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.config.annotation.web.configurers.ExpressionUrlAuthorizationConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;

@Configuration
public class SecurityConfig extends WebSecurityConfigurerAdapter {
	
	@Autowired
	OpenviduConfig openviduConf;
	
	@Override
	protected void configure(HttpSecurity http) throws Exception {
		ExpressionUrlAuthorizationConfigurer<HttpSecurity>.ExpressionInterceptUrlRegistry conf = http.csrf().disable()
		.authorizeRequests()
        .antMatchers(HttpMethod.POST, "/api/sessions").authenticated()
        .antMatchers(HttpMethod.POST, "/api/tokens").authenticated()
        .antMatchers(HttpMethod.POST, "/api/recordings/start").authenticated()
        .antMatchers(HttpMethod.POST, "/api/recordings/stop").authenticated()
        .antMatchers(HttpMethod.GET, "/api/recordings").authenticated()
        .antMatchers(HttpMethod.GET, "/api/recordings/**").authenticated()
        .antMatchers(HttpMethod.DELETE, "/api/recordings/**").authenticated()
        .antMatchers("/").authenticated();
        
        if (openviduConf.getOpenViduRecordingFreeAccess()) {
        	conf = conf.antMatchers("/recordings/*").permitAll();
        } else {
        	conf = conf.antMatchers("/recordings/*").authenticated();
        }
        
        conf.and().sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS)
        .and().httpBasic();
	}
    
	@Autowired
    public void configureGlobal(AuthenticationManagerBuilder auth) throws Exception {
        auth.inMemoryAuthentication()
          .withUser("OPENVIDUAPP").password(openviduConf.getOpenViduSecret()).roles("ADMIN");
    }

}