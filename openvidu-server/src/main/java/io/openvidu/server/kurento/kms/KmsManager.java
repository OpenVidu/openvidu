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
 *
 */

package io.openvidu.server.kurento.kms;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;

import org.kurento.client.KurentoClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.server.kurento.KurentoClientProvider;
import io.openvidu.server.kurento.KurentoClientSessionInfo;
import io.openvidu.server.kurento.OpenViduKurentoClientSessionInfo;

public abstract class KmsManager implements KurentoClientProvider {

  public static class KmsLoad implements Comparable<KmsLoad> {

    private Kms kms;
    private double load;

    public KmsLoad(Kms kms, double load) {
      this.kms = kms;
      this.load = load;
    }

    public Kms getKms() {
      return kms;
    }

    public double getLoad() {
      return load;
    }

    @Override
    public int compareTo(KmsLoad o) {
      return Double.compare(this.load, o.load);
    }
  }

  private final Logger log = LoggerFactory.getLogger(KmsManager.class);

  private List<Kms> kmss = new ArrayList<Kms>();
  private Iterator<Kms> usageIterator = null;

  @Override
  public KurentoClient getKurentoClient(KurentoClientSessionInfo sessionInfo) throws OpenViduException {
    if (!(sessionInfo instanceof OpenViduKurentoClientSessionInfo)) {
      throw new OpenViduException(Code.GENERIC_ERROR_CODE, "Unkown session info bean type (expected "
          + OpenViduKurentoClientSessionInfo.class.getName() + ")");
    }
    return getKms((OpenViduKurentoClientSessionInfo) sessionInfo).getKurentoClient();
  }

  /**
   * Returns a {@link Kms} using a round-robin strategy.
   *
   * @param sessionInfo
   *          session's id
   */
  public synchronized Kms getKms(OpenViduKurentoClientSessionInfo sessionInfo) {
    if (usageIterator == null || !usageIterator.hasNext()) {
      usageIterator = kmss.iterator();
    }
    return usageIterator.next();
  }

  public synchronized void addKms(Kms kms) {
    this.kmss.add(kms);
  }

  public synchronized Kms getLessLoadedKms() {
    return Collections.min(getKmsLoads()).kms;
  }

  public synchronized Kms getNextLessLoadedKms() {
    List<KmsLoad> sortedLoads = getKmssSortedByLoad();
    if (sortedLoads.size() > 1) {
      return sortedLoads.get(1).kms;
    } else {
      return sortedLoads.get(0).kms;
    }
  }

  public synchronized List<KmsLoad> getKmssSortedByLoad() {
    List<KmsLoad> kmsLoads = getKmsLoads();
    Collections.sort(kmsLoads);
    return kmsLoads;
  }

  private List<KmsLoad> getKmsLoads() {
    ArrayList<KmsLoad> kmsLoads = new ArrayList<>();
    for (Kms kms : kmss) {
      double load = kms.getLoad();
      kmsLoads.add(new KmsLoad(kms, load));
      log.trace("Calc load {} for kms: {}", load, kms.getUri());
    }
    return kmsLoads;
  }

  @Override
  public boolean destroyWhenUnused() {
    return false;
  }
}
