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

package io.openvidu.server.recording.service;

import java.io.Closeable;
import java.io.IOException;
import java.util.concurrent.CountDownLatch;

import com.github.dockerjava.api.async.ResultCallback;
import com.github.dockerjava.api.model.WaitResponse;

public class WaitForContainerStoppedCallback implements ResultCallback<WaitResponse> {

	CountDownLatch latch;

	public WaitForContainerStoppedCallback(CountDownLatch latch) {
		this.latch = latch;
	}

	@Override
	public void close() throws IOException {
		// TODO Auto-generated method stub
	}

	@Override
	public void onComplete() {
		latch.countDown();
	}

	@Override
	public void onError(Throwable arg0) {
		// TODO Auto-generated method stub
	}

	@Override
	public void onStart(Closeable arg0) {
		// TODO Auto-generated method stub
	}

	@Override
	public void onNext(WaitResponse arg0) {
		// TODO Auto-generated method stub
	}

}
