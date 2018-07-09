package io.openvidu.server.core;

import org.apache.commons.lang3.RandomStringUtils;

public class Utils {

    /**
     * Generate a random alpha numeric key chain
     * @return
     */
    public String generateRandomChain() {
        return RandomStringUtils.randomAlphanumeric(16).toLowerCase();
    }

    /**
     * Check that the metadata only has a max length of 10000 chars.
     *
     * @param metadata
     * @return
     */
    public boolean isMetadataFormatCorrect(String metadata) {
        return (metadata.length() <= 10000);
    }
}
