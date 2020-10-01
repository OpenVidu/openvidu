package io.openvidu.test.browsers.utils.layout;

import java.util.concurrent.CountDownLatch;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.event.EventListener;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@SpringBootApplication
public class CustomLayoutHandler extends WebSecurityConfigurerAdapter implements WebMvcConfigurer {

	private static ConfigurableApplicationContext context;
	public static CountDownLatch initLatch;

	public static void main(String[] args, CountDownLatch initLatch) {
		CustomLayoutHandler.initLatch = initLatch;
		CustomLayoutHandler.context = new SpringApplicationBuilder(CustomLayoutHandler.class)
				.properties("spring.config.location:classpath:aplication-pro-layout-handler.properties").build()
				.run(args);
	}

	@Override
	protected void configure(HttpSecurity security) throws Exception {
		security.httpBasic().disable();
	}

	@EventListener(ApplicationReadyEvent.class)
	public void afterStartup() {
		CustomLayoutHandler.initLatch.countDown();
	}

	public static void shutDown() {
		CustomLayoutHandler.context.close();
	}

}
