package org.openvidu.server;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class InfoSocketConfig implements WebSocketConfigurer {
	
	@Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(infoHandler(), "/info");
        	//.setAllowedOrigins("*");
    }

    @Bean
    public InfoHandler infoHandler() {
        return new InfoHandler();
    }

}
