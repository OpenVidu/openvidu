/*
 * (C) Copyright 2017-2022 OpenVidu (https://openvidu.io)
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

package io.openvidu.server.webhook;

import java.util.List;

import org.apache.http.Header;

import io.openvidu.server.cdr.CDREvent;
import io.openvidu.server.cdr.CDREventName;
import io.openvidu.server.cdr.CDRLogger;
import io.openvidu.server.cdr.WebrtcDebugEvent;
import io.openvidu.server.kurento.endpoint.KmsEvent;
import io.openvidu.server.summary.SessionSummary;

public class CDRLoggerWebhook implements CDRLogger {

	private HttpWebhookSender webhookSender;

	public CDRLoggerWebhook(String webhookEndpoint, List<Header> webhookHeaders, List<CDREventName> webhookEvents) {
		this.webhookSender = new HttpWebhookSender(webhookEndpoint, webhookHeaders, webhookEvents);
	}

	@Override
	public void log(CDREvent event) {
		this.webhookSender.sendHttpPostCallbackAsync(event);
	}

	@Override
	public void log(KmsEvent event) {
	}

	@Override
	public void log(WebrtcDebugEvent event) {
	}

	@Override
	public void log(SessionSummary sessionSummary) {
	}

}
