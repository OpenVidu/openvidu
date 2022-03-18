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

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Semaphore;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

public class InfoHandler extends TextWebSocketHandler {
	
	private static final Logger log = LoggerFactory.getLogger(InfoHandler.class);
	
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
		log.info("Info websocket stablished...");
		this.sessions.put(session.getId(), session);
	}
	
	@Override
	public void afterConnectionClosed(WebSocketSession session, CloseStatus close) throws Exception {
		log.info("Info websocket closed: " + close.getReason());
		this.sessions.remove(session.getId());
		session.close();
	}
	
	@Override
	protected void handleTextMessage(WebSocketSession session, TextMessage message)
			throws Exception {
		log.info("Message received: " + message.getPayload());
	}
	
}
