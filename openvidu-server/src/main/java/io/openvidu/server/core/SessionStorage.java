package io.openvidu.server.core;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.internal.ProtocolElements;
import io.openvidu.java.client.SessionProperties;
import io.openvidu.server.OpenViduServer;
import io.openvidu.server.coturn.CoturnCredentialsService;
import io.openvidu.server.coturn.TurnCredentials;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

public class SessionStorage {

    private static final Logger log = LoggerFactory.getLogger(SessionStorage.class);

    @Autowired
    private Utils utils;

    @Autowired
    private CoturnCredentialsService coturnCredentialsService;

    protected ConcurrentMap<String, Session> sessions = new ConcurrentHashMap<>();
    protected ConcurrentMap<String, SessionProperties> sessionProperties = new ConcurrentHashMap<>();
    protected ConcurrentMap<String, ConcurrentHashMap<String, Participant>> sessionidParticipantpublicidParticipant = new ConcurrentHashMap<>();
    protected ConcurrentMap<String, Boolean> insecureUsers = new ConcurrentHashMap<>();
    protected ConcurrentMap<String, ConcurrentHashMap<String, Token>> sessionidTokenTokenobj = new ConcurrentHashMap<>();

    /**
     * Returns a Session given its id
     *
     * @return Session
     */
    public Session getSession(String sessionId) {
        return sessions.get(sessionId);
    }

    /**
     * Returns all currently active (opened) sessions.
     *
     * @return set of the session's identifiers
     */
    public Set<String> getSessions() {
        return new HashSet<String>(sessions.keySet());
    }

    /**
     * Returns all currently active (opened) sessions.
     *
     * @return set of the session's identifiers
     */
    public Collection<Session> getSessionObjects() {
        return sessions.values();
    }

    public Session putSessionIfAbsent(String sessionId, Session session) { return sessions.putIfAbsent(sessionId, session); }

    public SessionProperties getSessionProperties(String sessionId) { return this.sessionProperties.get(sessionId); }

    public SessionProperties putSessionPropertiesIfAbsent(String sessionId, SessionProperties sessionProperties) {
        return this.sessionProperties.putIfAbsent(sessionId, sessionProperties);
    }

    /**
     * Returns all the participants inside a session.
     *
     * @param sessionId
     *            identifier of the session
     * @return set of {@link Participant}
     * @throws OpenViduException
     *             in case the session doesn't exist
     */
    public Set<Participant> getParticipants(String sessionId) throws OpenViduException {
        Session session = sessions.get(sessionId);
        if (session == null) {
            throw new OpenViduException(OpenViduException.Code.ROOM_NOT_FOUND_ERROR_CODE, "Session '" + sessionId + "' not found");
        }
        Set<Participant> participants = session.getParticipants();
        participants.removeIf(p -> p.isClosed());
        return participants;
    }

    /**
     * Returns a participant in a session
     *
     * @param sessionId
     *            identifier of the session
     * @param participantPrivateId
     *            private identifier of the participant
     * @return {@link Participant}
     * @throws OpenViduException
     *             in case the session doesn't exist or the participant doesn't
     *             belong to it
     */
    public Participant getParticipant(String sessionId, String participantPrivateId) throws OpenViduException {
        Session session = sessions.get(sessionId);
        if (session == null) {
            throw new OpenViduException(OpenViduException.Code.ROOM_NOT_FOUND_ERROR_CODE, "Session '" + sessionId + "' not found");
        }
        Participant participant = session.getParticipantByPrivateId(participantPrivateId);
        if (participant == null) {
            throw new OpenViduException(OpenViduException.Code.USER_NOT_FOUND_ERROR_CODE,
                    "Participant '" + participantPrivateId + "' not found in session '" + sessionId + "'");
        }
        return participant;
    }

    /**
     * Returns a participant
     *
     * @param participantPrivateId
     *            private identifier of the participant
     * @return {@link Participant}
     * @throws OpenViduException
     *             in case the participant doesn't exist
     */
    public Participant getParticipant(String participantPrivateId) throws OpenViduException {
        for (Session session : sessions.values()) {
            if (!session.isClosed()) {
                if (session.getParticipantByPrivateId(participantPrivateId) != null) {
                    return session.getParticipantByPrivateId(participantPrivateId);
                }
            }
        }
        throw new OpenViduException(OpenViduException.Code.USER_NOT_FOUND_ERROR_CODE,
                "No participant with private id '" + participantPrivateId + "' was found");
    }

    public void storeSessionId(String sessionId, SessionProperties sessionProperties) {
        this.sessionidParticipantpublicidParticipant.putIfAbsent(sessionId, new ConcurrentHashMap<>());
        this.sessionProperties.putIfAbsent(sessionId, sessionProperties);
        showTokens();
    }

    public ConcurrentHashMap<String, Token> putTokenObject(String  sessionId, ConcurrentHashMap<String, Token> map) {
        return this.sessionidTokenTokenobj.putIfAbsent(sessionId, map);
    }

    public void removeTokenObject(String sessionId) {
        this.sessionidTokenTokenobj.remove(sessionId);
    }

    public ConcurrentHashMap<String, Token> getTokenObject(String sessionId) {
        return this.sessionidTokenTokenobj.get(sessionId);
    }

    public String newToken(String sessionId, ParticipantRole role, String serverMetadata) throws OpenViduException {
        ConcurrentHashMap<String, Token> map = this.putTokenObject(sessionId, new ConcurrentHashMap<>());

        if (map != null) {

            if (!utils.isMetadataFormatCorrect(serverMetadata)) {
                log.error("Data invalid format. Max length allowed is 10000 chars");
                throw new OpenViduException(OpenViduException.Code.GENERIC_ERROR_CODE,
                        "Data invalid format. Max length allowed is 10000 chars");
            }

            String token = OpenViduServer.publicUrl;
            token += "?sessionId=" + sessionId;
            token += "&token=" + utils.generateRandomChain();
            token += "&role=" + role.name();
            TurnCredentials turnCredentials = null;
            if (this.coturnCredentialsService.isCoturnAvailable()) {
                turnCredentials = coturnCredentialsService.createUser();
                if (turnCredentials != null) {
                    token += "&turnUsername=" + turnCredentials.getUsername();
                    token += "&turnCredential=" + turnCredentials.getCredential();
                }
            }
            Token t = new Token(token, role, serverMetadata, turnCredentials);

            map.putIfAbsent(token, t);
            this.showTokens();
            return token;

        } else {
            this.removeTokenObject(sessionId);
            log.error("sessionId [" + sessionId + "] is not valid");
            throw new OpenViduException(OpenViduException.Code.ROOM_NOT_FOUND_ERROR_CODE, "sessionId [" + sessionId + "] not found");
        }
    }

    public boolean isTokenValidInSession(String token, String sessionId, String participanPrivatetId) {
        if (!this.isInsecureParticipant(participanPrivatetId)) {
            if (this.sessionidTokenTokenobj.get(sessionId) != null) {
                return this.sessionidTokenTokenobj.get(sessionId).containsKey(token);
            } else {
                return false;
            }
        } else {
            this.sessionidParticipantpublicidParticipant.putIfAbsent(sessionId, new ConcurrentHashMap<>());
            this.sessionidTokenTokenobj.putIfAbsent(sessionId, new ConcurrentHashMap<>());
            this.sessionidTokenTokenobj.get(sessionId).putIfAbsent(token,
                    new Token(token, ParticipantRole.PUBLISHER, "",
                            this.coturnCredentialsService.isCoturnAvailable()
                                    ? this.coturnCredentialsService.createUser()
                                    : null));
            return true;
        }
    }

    public boolean isParticipantInSession(String sessionId, Participant participant) {
        Session session = this.sessions.get(sessionId);
        if (session != null) {
            return (session.getParticipantByPrivateId(participant.getParticipantPrivateId()) != null);
        } else {
            throw new OpenViduException(OpenViduException.Code.ROOM_NOT_FOUND_ERROR_CODE, "[" + sessionId + "] is not a valid sessionId");
        }
    }

    public boolean isPublisherInSession(String sessionId, Participant participant) {
        if (!this.isInsecureParticipant(participant.getParticipantPrivateId())) {
            if (this.sessionidParticipantpublicidParticipant.get(sessionId) != null) {
                return (ParticipantRole.PUBLISHER.equals(participant.getToken().getRole())
                        || ParticipantRole.MODERATOR.equals(participant.getToken().getRole()));
            } else {
                return false;
            }
        } else {
            return true;
        }
    }

    public boolean isInsecureParticipant(String participantPrivateId) {
        if (this.insecureUsers.containsKey(participantPrivateId)) {
            log.info("The user with private id {} is an INSECURE user", participantPrivateId);
            return true;
        }
        return false;
    }

    public void newInsecureParticipant(String participantPrivateId) {
        this.insecureUsers.put(participantPrivateId, true);
    }

    public void removeInsecureParticipant(String participantPrivateId) {
        this.insecureUsers.remove(participantPrivateId);
    }

    public ConcurrentHashMap<String, Participant> getPublicIdParticipantMap(String sessionId) {
        return this.sessionidParticipantpublicidParticipant.get(sessionId);
    }

    public Participant newParticipant(String sessionId, String participantPrivatetId, Token token,
                                      String clientMetadata) {
        if (this.sessionidParticipantpublicidParticipant.get(sessionId) != null) {
            String participantPublicId = utils.generateRandomChain();
            Participant p = new Participant(participantPrivatetId, participantPublicId, token, clientMetadata);
            while (this.sessionidParticipantpublicidParticipant.get(sessionId).putIfAbsent(participantPublicId,
                    p) != null) {
                participantPublicId = utils.generateRandomChain();
                p.setParticipantPublicId(participantPublicId);
            }
            return p;
        } else {
            throw new OpenViduException(OpenViduException.Code.ROOM_NOT_FOUND_ERROR_CODE, sessionId);
        }
    }

    public Participant newRecorderParticipant(String sessionId, String participantPrivatetId, Token token,
                                              String clientMetadata) {
        if (this.sessionidParticipantpublicidParticipant.get(sessionId) != null) {
            Participant p = new Participant(participantPrivatetId, ProtocolElements.RECORDER_PARTICIPANT_PUBLICID,
                    token, clientMetadata);
            this.sessionidParticipantpublicidParticipant.get(sessionId)
                    .put(ProtocolElements.RECORDER_PARTICIPANT_PUBLICID, p);
            return p;
        } else {
            throw new OpenViduException(OpenViduException.Code.ROOM_NOT_FOUND_ERROR_CODE, sessionId);
        }
    }

    public Token consumeToken(String sessionId, String participantPrivateId, String token) {
        if (this.sessionidTokenTokenobj.get(sessionId) != null) {
            Token t = this.sessionidTokenTokenobj.get(sessionId).remove(token);
            if (t != null) {
                return t;
            } else {
                throw new OpenViduException(OpenViduException.Code.TOKEN_CANNOT_BE_CREATED_ERROR_CODE, sessionId);
            }
        } else {
            throw new OpenViduException(OpenViduException.Code.ROOM_NOT_FOUND_ERROR_CODE, sessionId);
        }
    }

    public void emptyCollections(Session session) {
        sessions.remove(session.getSessionId());

        sessionProperties.remove(session.getSessionId());
        sessionidParticipantpublicidParticipant.remove(session.getSessionId());
        sessionidTokenTokenobj.remove(session.getSessionId());

        log.warn("Session '{}' removed and closed", session.getSessionId());
    }

    public void showTokens() {  log.info("<SESSIONID, TOKENS>: {}", this.sessionidTokenTokenobj.toString()); }

    public void showInsecureParticipants() {
        log.info("<INSECURE_PARTICIPANTS>: {}", this.insecureUsers.toString());
    }

    public void showAllParticipants() {
        log.info("<SESSIONID, PARTICIPANTS>: {}", this.sessionidParticipantpublicidParticipant.toString());
    }

    public boolean isModeratorInSession(String sessionId, Participant participant) {
        if (!this.isInsecureParticipant(participant.getParticipantPrivateId())) {
            if (this.sessionidParticipantpublicidParticipant.get(sessionId) != null) {
                return ParticipantRole.MODERATOR.equals(participant.getToken().getRole());
            } else {
                return false;
            }
        } else {
            return true;
        }
    }
}
