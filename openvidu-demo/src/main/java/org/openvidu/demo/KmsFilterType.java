/*
 * (C) Copyright 2016 Kurento (http://kurento.org/)
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
package org.openvidu.demo;

/**
 * @author Radu Tom Vlad (radutom.vlad@gmail.com)
 * @since 6.5.1
 */
public enum KmsFilterType {
  HAT("hat", "hat"), MARKER("marker", "marker");

  private String typeValue;
  private String customRequestParam;

  private KmsFilterType(String val, String customRequestParam) {
    this.typeValue = val;
    this.customRequestParam = customRequestParam;
  }

  public String getCustomRequestParam() {
    return customRequestParam;
  }

  /**
   * @param val
   *          filter type String value, ignoring case
   * @return the filter type, {@link #HAT} if none found
   */
  public static KmsFilterType parseType(String val) {
    for (KmsFilterType t : KmsFilterType.values()) {
      if (t.typeValue.equalsIgnoreCase(val)) {
        return t;
      }
    }
    return HAT;
  }
}
