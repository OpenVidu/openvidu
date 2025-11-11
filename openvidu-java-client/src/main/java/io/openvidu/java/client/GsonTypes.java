package io.openvidu.java.client;

import java.lang.reflect.Type;
import java.util.Map;

import com.google.gson.reflect.TypeToken;

public final class GsonTypes {

    public static final Type STRING_OBJECT_MAP = new TypeToken<Map<String, Object>>() {
    }.getType();

    private GsonTypes() {
        // Utility class
    }
}
