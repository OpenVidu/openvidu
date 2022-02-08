package io.openvidu.java.client;

import com.google.gson.JsonObject;
import org.apache.commons.validator.routines.DomainValidator;
import org.apache.commons.validator.routines.InetAddressValidator;

import java.net.Inet6Address;
import java.net.UnknownHostException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class IceServerProperties {

    private String url;
    private String username;
    private String credential;

    public String getUrl() {
        return url;
    }

    public String getUsername() {
        return username;
    }

    public String getCredential() {
        return credential;
    }

    private IceServerProperties(String url, String username, String credential) {
        this.url = url;
        this.username = username;
        this.credential = credential;
    }

    /**
     * Ice server properties following RTCIceServers format:
     * https://developer.mozilla.org/en-US/docs/Web/API/RTCIceServer/urls
     * @return
     */
    public JsonObject toJson() {
        JsonObject json = new JsonObject();
        json.addProperty("url", getUrl());
        if (getUsername() != null && !getUsername().isEmpty()) {
            json.addProperty("username", getUsername());
        }
        if (getCredential() != null && !getCredential().isEmpty()) {
            json.addProperty("credential", getCredential());
        }
        return json;
    }

    public static class Builder {

        private String url;
        private String username;
        private String credential;

        public IceServerProperties.Builder url(String url) {
            this.url = url;
            return this;
        }

        public IceServerProperties.Builder username(String userName) {
            this.username = userName;
            return this;
        }

        public IceServerProperties.Builder credential(String credential) {
            this.credential = credential;
            return this;
        }


        public IceServerProperties build() throws IllegalArgumentException {
            if (this.url == null) {
                throw new IllegalArgumentException("External turn url cannot be null");
            }
            this.checkValidStunTurn(this.url);
            if (this.url.startsWith("turn")) {
                if ((this.username == null || this.credential == null)) {
                    throw new IllegalArgumentException("Credentials must be defined while using turn");
                }
            } else if (this.url.startsWith("stun")) {
                if (this.username != null || this.credential != null) {
                    // Credentials can not be defined using stun
                    throw new IllegalArgumentException("Credentials can not be defined while using stun.");
                }
            }
            return new IceServerProperties(this.url, this.username, this.credential);
        }

        /** Parsing Turn Stun Uri based on:
         * - https://datatracker.ietf.org/doc/html/rfc7065#section-3.1
         * - https://datatracker.ietf.org/doc/html/rfc7064#section-3.1
         */
        private void checkValidStunTurn(String uri) throws IllegalArgumentException {
            final String TCP_TRANSPORT_SUFFIX = "?transport=tcp";
            final String UDP_TRANSPORT_SUFFIX = "?transport=udp";

            // Protocols which accepts transport=tcp and transport=udp
            final Set<String> TURN_PROTOCOLS = new HashSet<>(Arrays.asList(
                    "turn",
                    "turns"
            ));
            final Set<String> STUN_PROTOCOLS = new HashSet<>(Arrays.asList(
                    "stun",
                    "stuns"
            ));

            // Fails if no colons
            int firstColonPos = uri.indexOf(':');
            if (firstColonPos == -1) {
                throw new IllegalArgumentException("Not a valid TURN/STUN uri provided. " +
                        "No colons found in: '" + uri + "'");
            }

            // Get protocol and check
            String protocol = uri.substring(0, firstColonPos);
            if (!TURN_PROTOCOLS.contains(protocol) && !STUN_PROTOCOLS.contains(protocol)) {
                throw new IllegalArgumentException("The protocol '" + protocol + "' is invalid. Only valid values are: "
                        + TURN_PROTOCOLS + " " + STUN_PROTOCOLS);
            }

            // Check if query param with transport exist
            int qmarkPos = uri.indexOf('?');
            String hostAndPort = uri.substring(firstColonPos + 1);
            if (qmarkPos != -1) {
                if (TURN_PROTOCOLS.contains(protocol)) {
                    // Only Turn uses transport arg
                    String rawTransportType = uri.substring(qmarkPos);
                    hostAndPort = uri.substring(firstColonPos + 1, qmarkPos);
                    if (!TCP_TRANSPORT_SUFFIX.equals(rawTransportType) && !UDP_TRANSPORT_SUFFIX.equals(rawTransportType)) {
                        // If other argument rather than transport is specified, it is a wrong query for a STUN/TURN uri
                        throw new IllegalArgumentException("Wrong value specified in STUN/TURN uri: '"
                                + uri + "'. " + "Unique valid arguments after '?' are '"
                                + TCP_TRANSPORT_SUFFIX + "' or '" + UDP_TRANSPORT_SUFFIX);
                    }
                } else {
                    throw new IllegalArgumentException("STUN uri can't have any '?' query param");
                }
            }

            // Check if port is defined
            int portColon = hostAndPort.indexOf(':');
            // IPv6 are defined between brackets
            int startIpv6Index = hostAndPort.indexOf('[');
            int endIpv6Index = hostAndPort.indexOf(']');
            if (startIpv6Index == -1 ^ endIpv6Index == -1) {
                throw new IllegalArgumentException("Not closed bracket '[' or ']' in uri: " + uri);
            }

            if (portColon != -1) {
                if (startIpv6Index == -1 && endIpv6Index == -1) {
                    // If Ipv4 and port defined
                    String[] splittedHostAndPort = hostAndPort.split(":");
                    if (splittedHostAndPort.length != 2) {
                        throw new IllegalArgumentException("Host or port are not correctly " +
                                "defined in STUN/TURN uri: '" + uri + "'");
                    }
                    String host = splittedHostAndPort[0];
                    String port = splittedHostAndPort[1];

                    // Check if host is defined. Valid Host (Domain or IP) will be done at server side
                    checkHostAndPort(uri, host, port);
                } else {
                    // If portColon is found and Ipv6
                    String ipv6 = hostAndPort.substring(startIpv6Index + 1, endIpv6Index);
                    String auxPort = hostAndPort.substring(endIpv6Index + 1);
                    if (auxPort.startsWith(":")) {
                        if (auxPort.length() == 1) {
                            throw new IllegalArgumentException("Host or port are not correctly defined in STUN/TURN uri: " + uri);
                        }
                        // If port is defined
                        // Get port without colon and check host and port
                        String host = ipv6;
                        String port = auxPort.substring(1);
                        checkHostAndPort(uri, host, port);
                    } else if (auxPort.length() > 0) {
                        // If auxPort = 0, no port is defined
                        throw new IllegalArgumentException("Port is not specified correctly after IPv6 in uri: '" + uri + "'");
                    }
                }
            } else {
                // If portColon not found, only host is defined
                String host = hostAndPort;
                checkHost(uri, host);
            }
        }

        private void checkHost(String uri, String host) {
            if (host == null || host.isEmpty()) {
                throw new IllegalArgumentException("Host defined in '" + uri + "' is empty or null");
            }
            if (DomainValidator.getInstance().isValid(host)) {
                return;
            }
            InetAddressValidator ipValidator = InetAddressValidator.getInstance();
            if (ipValidator.isValid(host)) {
                return;
            }
            try {
                Inet6Address.getByName(host).getHostAddress();
                return;
            } catch (UnknownHostException e) {
                throw new IllegalArgumentException("Is not a valid Internet Address (IP or Domain Name): '" + host + "'");
            }
        }

        private void checkPort(String uri, String port) {
            if (port == null || port.isEmpty()) {
                throw new IllegalArgumentException("Port defined in '" + uri + "' is empty or null");
            }

            try {
                int parsedPort = Integer.parseInt(port);
                if (parsedPort <= 0 || parsedPort > 65535) {
                    throw new IllegalArgumentException("The port defined in '" + uri + "' is not a valid port number (0-65535)");
                }
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("The port defined in '" + uri + "' is not a number (0-65535)");
            }
        }

        private void checkHostAndPort(String uri, String host, String port) {
            this.checkHost(uri, host);
            this.checkPort(uri, port);
        }
    }

}
