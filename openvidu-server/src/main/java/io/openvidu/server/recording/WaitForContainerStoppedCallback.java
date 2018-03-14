package io.openvidu.server.recording;

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
