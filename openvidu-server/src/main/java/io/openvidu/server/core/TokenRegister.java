package io.openvidu.server.core;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * This service class represents all the tokens currently registered by an active sessions
 * Each time a token is created, it is registered by {@link SessionManager} using {@link #registerToken(String, Token)}
 * All registered tokens will be present until {@link SessionManager} calls the method {@link #deregisterTokens(String)}
 *
 * The purpose of this service is to know when a token was registered into a session by using
 * public method {@link #isTokenRegistered(String)}
 */
public class TokenRegister {

    private ConcurrentHashMap<String, Token> tokensRegistered = new ConcurrentHashMap<>();
    private ConcurrentHashMap<String, ConcurrentHashMap<String, Token>> tokensRegisteredBySession = new ConcurrentHashMap<>();

    /**
     * Register a token of an specific active session
     * @param sessionId Id of the sessions where the token is generated
     * @param token Token to register
     */
    protected synchronized void registerToken(String sessionId, Token token) {
        this.tokensRegisteredBySession.putIfAbsent(sessionId, new ConcurrentHashMap<>());
        ConcurrentHashMap<String, Token> registeredTokensInSession = this.tokensRegisteredBySession.get(sessionId);
        this.tokensRegistered.put(token.getToken(), token);
        registeredTokensInSession.put(token.getToken(), token);
    }

    /**
     * Deregister all tokens of an specific session which is not active
     * @param sessionId Id of the session which is no longer active
     */
    protected synchronized void deregisterTokens(String sessionId) {
        if (tokensRegisteredBySession.containsKey(sessionId)) {
            for(Map.Entry<String, Token> tokenRegisteredInSession: tokensRegistered.entrySet()) {
                tokensRegistered.remove(tokenRegisteredInSession.getKey());
            }
            tokensRegisteredBySession.remove(sessionId);
        }
    }

    /**
     * Check if the current token string was registered in an active session
     * @param token Token string to check if it is registered
     * @return <code>true</code> if token was registered. <code>false</code> otherwise
     */
    public boolean isTokenRegistered(String token) {
        return this.tokensRegistered.containsKey(token);
    }

    /**
     * Get registered token from token string
     * @param tokenKey string key which represents the token
     * @return
     */
    public Token getRegisteredToken(String tokenKey) {
        Token token = this.tokensRegistered.get(tokenKey);
        if (token != null) {
            return token;
        }
        return null;
    }


}
