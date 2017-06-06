/*
 * (C) Copyright 2015 Kurento (http://kurento.org/)
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

package io.openvidu.demo;

class ClientConfig {
  private boolean loopbackRemote;
  private boolean loopbackAndLocal;
  private String filterRequestParam;

  public boolean isLoopbackRemote() {
    return loopbackRemote;
  }

  public void setLoopbackRemote(boolean loopbackRemote) {
    this.loopbackRemote = loopbackRemote;
  }

  public boolean isLoopbackAndLocal() {
    return loopbackAndLocal;
  }

  public void setLoopbackAndLocal(boolean loopbackAndLocal) {
    this.loopbackAndLocal = loopbackAndLocal;
  }

  public String getFilterRequestParam() {
    return filterRequestParam;
  }

  public void setFilterRequestParam(String filterRequestParam) {
    this.filterRequestParam = filterRequestParam;
  }

  @Override
  public String toString() {
    StringBuilder builder = new StringBuilder();
    builder.append("Loopback [remote=").append(loopbackRemote).append(", andLocal=")
        .append(loopbackAndLocal).append("], filterRequestParam=").append(filterRequestParam);
    return builder.toString();
  }
}
