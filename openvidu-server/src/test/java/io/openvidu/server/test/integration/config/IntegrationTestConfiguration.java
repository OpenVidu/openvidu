package io.openvidu.server.test.integration.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import org.kurento.client.Continuation;
import org.kurento.client.KurentoClient;
import org.kurento.client.MediaPipeline;
import org.kurento.client.ServerManager;
import org.mockito.Mockito;
import org.powermock.reflect.Whitebox;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

import io.openvidu.server.kurento.kms.FixedOneKmsManager;
import io.openvidu.server.kurento.kms.Kms;
import io.openvidu.server.kurento.kms.KmsManager;
import io.openvidu.server.kurento.kms.KmsProperties;

/**
 * KmsManager bean mock
 * 
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 */
@TestConfiguration
public class IntegrationTestConfiguration {

	@Bean
	public KmsManager kmsManager() throws Exception {
		final KmsManager spy = Mockito.spy(new FixedOneKmsManager());
		doAnswer(invocation -> {
			List<Kms> successfullyConnectedKmss = new ArrayList<>();
			List<KmsProperties> kmsProperties = invocation.getArgument(0);
			for (KmsProperties kmsProp : kmsProperties) {
				Kms kms = new Kms(kmsProp, Whitebox.getInternalState(spy, "loadManager"),
						Whitebox.getInternalState(spy, "quarantineKiller"));
				KurentoClient kClient = mock(KurentoClient.class);

				doAnswer(i -> {
					Thread.sleep((long) (Math.random() * 1000));
					((Continuation<MediaPipeline>) i.getArgument(0)).onSuccess(mock(MediaPipeline.class));
					return null;
				}).when(kClient).createMediaPipeline((Continuation<MediaPipeline>) any());

				ServerManager serverManagerMock = mock(ServerManager.class);
				when(serverManagerMock.getCpuCount()).thenReturn(new Random().nextInt(32) + 1);
				when(kClient.getServerManager()).thenReturn(serverManagerMock);

				kms.setKurentoClient(kClient);
				kms.setKurentoClientConnected(true);
				kms.setTimeOfKurentoClientConnection(System.currentTimeMillis());

				spy.addKms(kms);
				successfullyConnectedKmss.add(kms);
			}
			return successfullyConnectedKmss;
		}).when(spy).initializeKurentoClients(any(List.class), any(Boolean.class));
		return spy;
	}

}
