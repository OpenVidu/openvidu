/*
 * (C) Copyright 2017-2019 OpenVidu (https://openvidu.io/)
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
 */

package io.openvidu.client.internal;

import org.kurento.jsonrpc.message.Request;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;

/**
 * JSON tools for extracting info from request or response elements.
 *
 * @author <a href="mailto:rvlad@naevatec.com">Radu Tom Vlad</a>
 */
public class JsonRoomUtils {

  public static <T> T getRequestParam(Request<JsonObject> request, String paramName, Class<T> type) {
    return getRequestParam(request, paramName, type, false);
  }

  public static <T> T getRequestParam(Request<JsonObject> request, String paramName, Class<T> type,
      boolean allowNull) {
    JsonObject params = request.getParams();
    if (params == null) {
      if (!allowNull) {
        throw new OpenViduException(Code.TRANSPORT_REQUEST_ERROR_CODE,
            "Invalid request lacking parameter '" + paramName + "'");
      } else {
        return null;
      }
    }
    return getConverted(params.get(paramName), paramName, type, allowNull);
  }

  public static <T> T getResponseProperty(JsonElement result, String property, Class<T> type) {
    return getResponseProperty(result, property, type, false);
  }

  public static <T> T getResponseProperty(JsonElement result, String property, Class<T> type,
      boolean allowNull) {
    if (!(result instanceof JsonObject)) {
      throw new OpenViduException(Code.TRANSPORT_RESPONSE_ERROR_CODE,
          "Invalid response format. The response '" + result + "' should be a Json object");
    }
    return getConverted(result.getAsJsonObject().get(property), property, type, allowNull);
  }

  public static JsonArray getResponseArray(JsonElement result) {
    if (!result.isJsonArray()) {
      throw new OpenViduException(Code.TRANSPORT_RESPONSE_ERROR_CODE,
          "Invalid response format. The response '" + result + "' should be a Json array");
    }
    return result.getAsJsonArray();
  }

  @SuppressWarnings("unchecked")
  private static <T> T getConverted(JsonElement paramValue, String property, Class<T> type,
      boolean allowNull) {
    if (paramValue == null) {
      if (allowNull) {
        return null;
      } else {
        throw new OpenViduException(Code.TRANSPORT_ERROR_CODE, "Invalid method lacking parameter '"
            + property + "'");
      }
    }

    if (type == String.class) {
      if (paramValue.isJsonPrimitive()) {
        return (T) paramValue.getAsString();
      }
    }

    if (type == Integer.class) {
      if (paramValue.isJsonPrimitive()) {
        return (T) Integer.valueOf(paramValue.getAsInt());
      }
    }

    if (type == JsonArray.class) {
      if (paramValue.isJsonArray()) {
        return (T) paramValue.getAsJsonArray();
      }
    }

    throw new OpenViduException(Code.TRANSPORT_ERROR_CODE, "Param '" + property + "' with value '"
        + paramValue + "' is not a " + type.getName());
  }
}
