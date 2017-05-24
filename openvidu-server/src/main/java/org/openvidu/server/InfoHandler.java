package org.openvidu.server;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Semaphore;

import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

public class InfoHandler extends TextWebSocketHandler {
	
	Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
	Semaphore semaphore = new Semaphore(1);
	
	public void sendInfo(String info){
		for (WebSocketSession session : this.sessions.values()) {
			try {
				this.semaphore.acquire();
				session.sendMessage(new TextMessage(info));
				this.semaphore.release();
			} catch (IOException | InterruptedException e) {
				e.printStackTrace();
			}
		}
	}
	
	@Override
	public void afterConnectionEstablished(WebSocketSession session) throws Exception {
		System.out.println("Info websocket stablished...");
		this.sessions.put(session.getId(), session);
	}
	
		@Override
	public void afterConnectionClosed(WebSocketSession session, CloseStatus close) throws Exception {
		System.out.println("Info websocket closed: " + close.getReason());
		this.sessions.remove(session.getId());
		session.close();
	}
	
	@Override
	protected void handleTextMessage(WebSocketSession session, TextMessage message)
			throws Exception {
		System.out.println("Message received: " + message.getPayload());
	}
	
}
