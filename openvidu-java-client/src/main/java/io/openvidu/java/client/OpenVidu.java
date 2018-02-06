package io.openvidu.java.client;

import java.security.KeyManagementException;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;

import org.apache.http.auth.AuthScope;
import org.apache.http.auth.UsernamePasswordCredentials;
import org.apache.http.client.CredentialsProvider;
import org.apache.http.client.HttpClient;
import org.apache.http.conn.ssl.SSLConnectionSocketFactory;
import org.apache.http.conn.ssl.TrustSelfSignedStrategy;
import org.apache.http.impl.client.BasicCredentialsProvider;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.ssl.SSLContextBuilder;

public class OpenVidu {

	private String urlOpenViduServer;
	private String secret;
	private HttpClient myHttpClient;

    public OpenVidu(String urlOpenViduServer, String secret) {
    	
    	this.urlOpenViduServer = urlOpenViduServer;
    	
    	if (!this.urlOpenViduServer.endsWith("/")){
    		this.urlOpenViduServer += "/";
    	}

    	this.secret = secret;
    	
			CredentialsProvider provider = new BasicCredentialsProvider();
			UsernamePasswordCredentials credentials = new UsernamePasswordCredentials("OPENVIDUAPP", this.secret);
			provider.setCredentials(AuthScope.ANY, credentials);
			
	    	SSLContextBuilder builder = new SSLContextBuilder();
			try {
				builder.loadTrustMaterial(null, new TrustSelfSignedStrategy());
		     SSLConnectionSocketFactory sslsf = new SSLConnectionSocketFactory(builder.build(),
		            SSLConnectionSocketFactory.ALLOW_ALL_HOSTNAME_VERIFIER);
			/*SSLConnectionSocketFactory sslsf = new SSLConnectionSocketFactory(
		            builder.build());*/
		    this.myHttpClient = HttpClients.custom().setSSLSocketFactory(
		            sslsf).setDefaultCredentialsProvider(provider).build();
		    } catch (NoSuchAlgorithmException | KeyStoreException | KeyManagementException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
    }
    
    public Session createSession() throws OpenViduException {
    	Session s = new Session(myHttpClient, urlOpenViduServer);
    	return s;
    }
    
    public Session createSession(SessionProperties properties) throws OpenViduException {
    	Session s = new Session(myHttpClient, urlOpenViduServer, properties);
    	return s;
    }
    
    public void startRecording(String sessionId) {
    	// TODO: REST POST to start recording in OpenVidu Server
    }
    
    public void stopRecording(String sessionId) {
    	// TODO: REST POST to end recording in OpenVidu Server
    }
    
}
