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
 *
 */

package io.openvidu.server.rpc;

import java.util.Collection;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.kurento.jsonrpc.Session;
import org.kurento.jsonrpc.Transaction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class SessionWrapper {
  private static final Logger log = LoggerFactory.getLogger(SessionWrapper.class);

  private Session session;
  private ConcurrentMap<Integer, Transaction> transactions = new ConcurrentHashMap<Integer, Transaction>();

  public SessionWrapper(Session session) {
    this.session = session;
  }

  public Session getSession() {
    return session;
  }

  public Transaction getTransaction(Integer requestId) {
    return transactions.get(requestId);
  }

  public void addTransaction(Integer requestId, Transaction t) {
    Transaction oldT = transactions.putIfAbsent(requestId, t);
    if (oldT != null) {
      log.error("Found an existing transaction for the key {}", requestId);
    }
  }

  public void removeTransaction(Integer requestId) {
    transactions.remove(requestId);
  }

  public Collection<Transaction> getTransactions() {
    return transactions.values();
  }
}
