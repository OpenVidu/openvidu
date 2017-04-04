package org.openvidu.client;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.security.KeyManagementException;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;

import org.apache.http.HttpResponse;
import org.apache.http.auth.AuthScope;
import org.apache.http.auth.UsernamePasswordCredentials;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.CredentialsProvider;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.conn.ssl.SSLConnectionSocketFactory;
import org.apache.http.conn.ssl.TrustSelfSignedStrategy;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.BasicCredentialsProvider;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.ssl.SSLContextBuilder;
import org.json.simple.JSONObject;
import org.openvidu.client.OpenViduException.Code;

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
    
    public String createSession() throws OpenViduException, ClientProtocolException, IOException {
    	
    	HttpResponse response = myHttpClient.execute(new HttpGet(this.urlOpenViduServer + "getSessionId"));
		 
		int statusCode = response.getStatusLine().getStatusCode();
		if ((statusCode == org.apache.http.HttpStatus.SC_OK) && (response.getEntity().getContentLength() > 0)){
			System.out.println("Returning a SESSIONID");
			BufferedReader br = new BufferedReader(new InputStreamReader(response.getEntity().getContent()));
			String sessionId = br.readLine();
			
			return sessionId;
		} else {
			throw new OpenViduException(Code.TRANSPORT_REQUEST_ERROR_CODE, "Unable to generate a sessionID");
		}
    }
    
    public String generateToken(String sessionId, String role) throws OpenViduException, ClientProtocolException, IOException {
    	JSONObject json = new JSONObject();
		json.put(0, sessionId);
		json.put(1, role);
		
		HttpPost request = 	new HttpPost(this.urlOpenViduServer + "newToken");
		StringEntity params = new StringEntity(json.toString());
		request.addHeader("content-type", "application/json");
	    request.setEntity(params);
		
		HttpResponse response = myHttpClient.execute(request);
		 
		int statusCode = response.getStatusLine().getStatusCode();
		if ((statusCode == org.apache.http.HttpStatus.SC_OK) && (response.getEntity().getContentLength() > 0)){
			System.out.println("Returning a TOKEN");
			BufferedReader br = new BufferedReader(new InputStreamReader(response.getEntity().getContent()));
			String token = br.readLine();
			
			return token;
		} else {
			throw new OpenViduException(Code.TRANSPORT_REQUEST_ERROR_CODE, "Unable to generate a token");
		}
    }
}
