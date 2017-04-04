package openvidu.openvidu_sample_app.session_manager;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.security.KeyManagementException;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import openvidu.openvidu_sample_app.lesson.Lesson;
import openvidu.openvidu_sample_app.lesson.LessonRepository;
import openvidu.openvidu_sample_app.user.User;
import openvidu.openvidu_sample_app.user.UserComponent;

@RestController
@RequestMapping("/api-sessions")
public class SessionController {
	
	@Autowired
	private LessonRepository lessonRepository;
	
	@Autowired
	private UserComponent user;
	
	private Map<Long, String> lessonIdSessionId = new ConcurrentHashMap<>();
	private Map<String, Map<Long, String>> sessionIdUserIdToken = new ConcurrentHashMap<>();
	
	private final String OPENVIDU_URL = "https://localhost:8443/";
	private final String SECRET ="MY_SECRET";
	private HttpClient myHttpClient;
	
	public SessionController() {
		try {
			CredentialsProvider provider = new BasicCredentialsProvider();
			UsernamePasswordCredentials credentials = new UsernamePasswordCredentials("OPENVIDUAPP", SECRET);
			provider.setCredentials(AuthScope.ANY, credentials);
			
	    	SSLContextBuilder builder = new SSLContextBuilder();
			builder.loadTrustMaterial(null, new TrustSelfSignedStrategy());
		     SSLConnectionSocketFactory sslsf = new SSLConnectionSocketFactory(builder.build(),
		            SSLConnectionSocketFactory.ALLOW_ALL_HOSTNAME_VERIFIER);
			/*SSLConnectionSocketFactory sslsf = new SSLConnectionSocketFactory(
		            builder.build());*/
		    this.myHttpClient = HttpClients.custom().setSSLSocketFactory(
		            sslsf).setDefaultCredentialsProvider(provider).build();
	    } catch (NoSuchAlgorithmException | KeyStoreException | KeyManagementException e) {
			e.printStackTrace();
		}
	}
	
	@RequestMapping(value = "/create-session", method = RequestMethod.POST)
	public ResponseEntity<String> createSession(@RequestBody String lessonId) throws Exception {
		
		if (!this.userIsLogged()) {
			return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
		}
		
		if(!user.hasRoleTeacher()) {
			return new ResponseEntity<>(HttpStatus.FORBIDDEN);
		}
		
		long id_lesson = -1;
		try {
			id_lesson = Long.parseLong(lessonId);
		} catch(NumberFormatException e){
			return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
		}
		
		Lesson c = lessonRepository.findOne(id_lesson);
		
		if (!checkAuthorization(c, c.getTeacher())){
			return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
		}
		
		if(this.lessonIdSessionId.get(id_lesson) != null) {
			
			// If there's already a valid sessionId for this lesson, not necessary to ask for a new one 
			return new ResponseEntity<>(this.lessonIdSessionId.get(id_lesson), HttpStatus.OK);
			
		} else {
		
			/*
			String sessionId = this.openVidu.createSession();
			*/
			
			HttpResponse response = myHttpClient.execute(new HttpGet(OPENVIDU_URL + "getSessionId"));
			 
			int statusCode = response.getStatusLine().getStatusCode();
			if ((statusCode == org.apache.http.HttpStatus.SC_OK) && (response.getEntity().getContentLength() > 0)){
				System.out.println("Returning a sessionId...");
				BufferedReader br = new BufferedReader(new InputStreamReader(response.getEntity().getContent()));
				String sessionId = br.readLine();
				
				this.lessonIdSessionId.put(id_lesson, sessionId);
				this.sessionIdUserIdToken.put(sessionId, new HashMap<>());
				
				return new ResponseEntity<>(sessionId, HttpStatus.OK);
			} else {
				System.out.println("Problems with openvidu-server");
				return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
			}
		}
	}
	
	@RequestMapping(value = "/generate-token", method = RequestMethod.POST)
	public ResponseEntity<JSONObject> generateToken(@RequestBody String lessonId) throws Exception {
		
		if (!this.userIsLogged()) {
			return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
		}
		
		long id_lesson = -1;
		try{
			id_lesson = Long.parseLong(lessonId);
		}catch(NumberFormatException e){
			return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
		}
		
		Lesson c = lessonRepository.findOne(id_lesson);
		
		if (!checkAuthorizationUsers(c, c.getAttenders())){
			return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
		}
		
		if (this.lessonIdSessionId.get(id_lesson) == null){
			return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
		}
		
		String role = user.hasRoleTeacher() ? "PUBLISHER" : "SUBSCRIBER";
		
		/*
		String token = this.openVidu.generateToken(sessionId, role);
		*/
		
		JSONObject json = new JSONObject();
		json.put(0, this.lessonIdSessionId.get(id_lesson));
		json.put(1, role);
		
		HttpPost request = 	new HttpPost(OPENVIDU_URL + "newToken");
		StringEntity params = new StringEntity(json.toString());
		request.addHeader("content-type", "application/json");
	    request.setEntity(params);
		
		HttpResponse response = myHttpClient.execute(request);
		 
		int statusCode = response.getStatusLine().getStatusCode();
		if ((statusCode == org.apache.http.HttpStatus.SC_OK) && (response.getEntity().getContentLength() > 0)){
			System.out.println("Returning a sessionId and a token...");
			BufferedReader br = new BufferedReader(new InputStreamReader(response.getEntity().getContent()));
			String token = br.readLine();
			
			this.sessionIdUserIdToken.get(this.lessonIdSessionId.get(id_lesson)).put(this.user.getLoggedUser().getId(), token);
			
			JSONObject responseJson = new JSONObject();
			responseJson.put(0, this.lessonIdSessionId.get(id_lesson));
			responseJson.put(1, token);
			
			return new ResponseEntity<>(responseJson, HttpStatus.OK);
		} else {
			System.out.println("Problems with openvidu-server");
			return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}
	
	
	@RequestMapping(value = "/remove-user", method = RequestMethod.POST)
	public ResponseEntity<JSONObject> removeUser(@RequestBody String lessonId) throws Exception {
		
		if (!this.userIsLogged()) {
			return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
		}
		
		long id_lesson = -1;
		try{
			id_lesson = Long.parseLong(lessonId);
		}catch(NumberFormatException e){
			return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
		}
		
		Lesson c = lessonRepository.findOne(id_lesson);
		
		if (!checkAuthorizationUsers(c, c.getAttenders())){
			return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
		}
		
		if (this.lessonIdSessionId.get(id_lesson) == null){
			return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
		}
		
		String sessionId = this.lessonIdSessionId.get(id_lesson);
		if (this.sessionIdUserIdToken.get(sessionId).remove(this.user.getLoggedUser().getId()) != null){
			// This user has left the lesson
			if(this.sessionIdUserIdToken.get(sessionId).isEmpty()){
				// The last user has left the lesson
				this.lessonIdSessionId.remove(id_lesson);
				this.sessionIdUserIdToken.remove(sessionId);
			}
			return new ResponseEntity<>(HttpStatus.OK);
		} else {
			System.out.println("Problems in the app server: the user didn't have a valid token");
			return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}
	
	
	private boolean userIsLogged(){
		if (!user.isLoggedUser()) {
			System.out.println("Not user logged");
			return false;
		}
		return true; 
	}
	
	// Authorization checking for creating or joining a certain lesson
	private boolean checkAuthorization(Object o, User u){
		return !(o == null || !this.user.getLoggedUser().equals(u));
	}
	
	// Authorization checking for joining a session (the user must be an attender)
	private boolean checkAuthorizationUsers(Object o, Collection<User> users){
		return !(o == null || !users.contains(this.user.getLoggedUser()));
	}

}
