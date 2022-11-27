package io.openvidu.server.test.integration.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import org.junit.jupiter.api.Assertions;
import org.kurento.client.Continuation;
import org.kurento.client.KurentoClient;
import org.kurento.client.MediaPipeline;
import org.kurento.client.ServerInfo;
import org.kurento.client.ServerManager;
import org.kurento.client.ServerType;
import org.mockito.Mockito;
import org.powermock.reflect.Whitebox;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

import io.openvidu.server.kurento.core.KurentoSessionManager;
import io.openvidu.server.kurento.kms.DummyLoadManager;
import io.openvidu.server.kurento.kms.FixedOneKmsManager;
import io.openvidu.server.kurento.kms.Kms;
import io.openvidu.server.kurento.kms.KmsManager;
import io.openvidu.server.kurento.kms.KmsProperties;
import io.openvidu.server.kurento.kms.LoadManager;

/**
 * KmsManager bean mock
 * 
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 */
@TestConfiguration
public class IntegrationTestConfiguration {

	@Bean
	public KmsManager kmsManager() throws Exception {
		final KmsManager spy = Mockito.spy(new FixedOneKmsManager(new KurentoSessionManager(), new DummyLoadManager()));
		doAnswer(invocation -> {
			List<Kms> successfullyConnectedKmss = new ArrayList<>();
			List<KmsProperties> kmsProperties = null;
			try {
				kmsProperties = invocation.getArgument(0);
			} catch (Exception e) {
				Assertions.fail("Error getting argument from stubbed method: " + e.getMessage());
			}
			for (KmsProperties kmsProp : kmsProperties) {

				LoadManager loadManager = null;
				try {
					loadManager = Whitebox.getInternalState(spy, "loadManager");
				} catch (Exception e) {
					Assertions.fail("Error getting private property from stubbed object: " + e.getMessage());
				}
				Kms kms = new Kms(kmsProp, loadManager, spy);
				KurentoClient kClient = mock(KurentoClient.class);

				doAnswer(i -> {
					Thread.sleep((long) (Math.random() * 1000));
					Continuation<MediaPipeline> continuation = null;
					try {
						continuation = i.getArgument(0);
					} catch (Exception e) {
						System.err.println("Error getting argument from stubbed method: " + e.getMessage());
					}
					continuation.onSuccess(mock(MediaPipeline.class));
					return null;
				}).when(kClient).createMediaPipeline((Continuation<MediaPipeline>) any());

				ServerManager serverManagerMock = mock(ServerManager.class);
				ServerInfo serverInfoMock = new ServerInfo("6.16.0", new ArrayList<>(), ServerType.KMS,
						new ArrayList<>());
				when(serverManagerMock.getInfo()).thenReturn(serverInfoMock);
				when(serverManagerMock.getCpuCount()).thenReturn(new Random().nextInt(32) + 1);
				when(kClient.getServerManager()).thenReturn(serverManagerMock);

				kms.setKurentoClient(kClient);
				kms.setKurentoClientConnected(true, false);

				spy.addKms(kms);
				successfullyConnectedKmss.add(kms);
			}
			return successfullyConnectedKmss;
		}).when(spy).initializeKurentoClients(any(List.class), any(Boolean.class));
		return spy;
	}

}
