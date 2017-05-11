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
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
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
    
    public JSONObject createSession() throws IOException, ParseException {
    	
    	HttpResponse response = myHttpClient.execute(new HttpGet(this.urlOpenViduServer + "getSessionId"));
    	
		int statusCode = response.getStatusLine().getStatusCode();
		if ((statusCode == org.apache.http.HttpStatus.SC_OK)){
			System.out.println("Returning a SESSIONID");
			return this.httpResponseToJsonObject(response);
		} else {
			throw new OpenViduException(Code.SESSIONID_CANNOT_BE_CREATED_ERROR_CODE, "Unable to generate a sessionID");
		}
    }
    
    public JSONObject generateToken(String sessionId, String role) throws IOException, ParseException {
    	JSONObject json = new JSONObject();
		json.put(0, sessionId);
		json.put(1, role);
		
		HttpPost request = 	new HttpPost(this.urlOpenViduServer + "newToken");
		StringEntity params = new StringEntity(json.toString());
		request.addHeader("content-type", "application/json");
	    request.setEntity(params);
		
		HttpResponse response = myHttpClient.execute(request);
		
		int statusCode = response.getStatusLine().getStatusCode();
		if ((statusCode == org.apache.http.HttpStatus.SC_OK)){
			System.out.println("Returning a TOKEN");
			return this.httpResponseToJsonObject(response);
		} else {
			throw new OpenViduException(Code.TOKEN_CANNOT_BE_CREATED_ERROR_CODE, "Unable to generate a token");
		}
    }
    
    private JSONObject httpResponseToJsonObject(HttpResponse response) throws ParseException, UnsupportedOperationException, IOException{
    	BufferedReader rd = new BufferedReader(new InputStreamReader(response.getEntity().getContent()));
    	StringBuffer buf = new StringBuffer();
    	String line = "";
		while ((line = rd.readLine()) != null) {
		    buf.append(line);
		}
		JSONParser parser = new JSONParser();
		return ((JSONObject) parser.parse(buf.toString()));
    }
}
