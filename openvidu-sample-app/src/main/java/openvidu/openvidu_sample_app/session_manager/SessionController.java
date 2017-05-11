package openvidu.openvidu_sample_app.session_manager;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.json.simple.JSONObject;
import org.openvidu.client.OpenVidu;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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

	OpenVidu openVidu;
	
	@Autowired
	private LessonRepository lessonRepository;
	
	@Autowired
	private UserComponent user;
	
	private Map<Long, String> lessonIdSessionId = new ConcurrentHashMap<>();
	private Map<String, Map<Long, String>> sessionIdUserIdToken = new ConcurrentHashMap<>();
	
	private final String OPENVIDU_URL = "https://localhost:8443/";
	
	private String SECRET;
	
	public SessionController(@Value("${openvidu.secret}") String secret){
		this.SECRET = secret;
		this.openVidu = new OpenVidu(OPENVIDU_URL, SECRET);
	}
	
	@RequestMapping(value = "/create-session", method = RequestMethod.POST)
	public ResponseEntity<JSONObject> createSession(@RequestBody String lessonId) {
		
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
		
		JSONObject responseJson = new JSONObject();
		
		if(this.lessonIdSessionId.get(id_lesson) != null) {
			// If there's already a valid sessionId for this lesson, not necessary to ask for a new one 
			responseJson.put(0, this.lessonIdSessionId.get(id_lesson));
			return new ResponseEntity<>(responseJson, HttpStatus.OK);
		}
		else {
			try {
				JSONObject json = this.openVidu.createSession();
				String sessionId = (String) json.get("0");
				this.lessonIdSessionId.put(id_lesson, sessionId);
				this.sessionIdUserIdToken.put(sessionId, new HashMap<>());
				
				showMap();
				
				responseJson.put(0, sessionId);
				
				return new ResponseEntity<>(responseJson, HttpStatus.OK);
			} catch (Exception e) {
				return getErrorResponse(e);
			}
		}
	}
	
	@RequestMapping(value = "/generate-token", method = RequestMethod.POST)
	public ResponseEntity<JSONObject> generateToken(@RequestBody String lessonId) {
		
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
			System.out.println("Not authorizedd");
			return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
		}
		
		if (this.lessonIdSessionId.get(id_lesson) == null){
			System.out.println("There's no sessionId fot this lesson");
			return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
		}
		
		String sessionId = this.lessonIdSessionId.get(id_lesson);
		String role = user.hasRoleTeacher() ? "PUBLISHER" : "SUBSCRIBER";
		
		JSONObject responseJson = new JSONObject();
		
		try {
			String token = (String) this.openVidu.generateToken(sessionId, role).get("0");
			this.sessionIdUserIdToken.get(sessionId).put(this.user.getLoggedUser().getId(), token);
			
			responseJson.put(0, sessionId);
			responseJson.put(1, token);
			
			showMap();
			
			return new ResponseEntity<>(responseJson, HttpStatus.OK);
		} catch (Exception e) {
			return getErrorResponse(e);
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
			
			showMap();
			
			return new ResponseEntity<>(HttpStatus.OK);
		} else {
			System.out.println("Problems in the app server: the user didn't have a valid token");
			return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}
	
	
	private void showMap(){
		System.out.println("------------------------------");
		System.out.println(this.lessonIdSessionId.toString());
		System.out.println(this.sessionIdUserIdToken.toString());
		System.out.println("------------------------------");
	}
	
	
	private boolean userIsLogged(){
		if (!user.isLoggedUser()) {
			System.out.println("Not user logged");
			return false;
		}
		return true; 
	}
	
	private ResponseEntity<JSONObject> getErrorResponse(Exception e){
		JSONObject json = new JSONObject();
		json.put("cause", e.getCause());
		json.put("error", e.getMessage());
		json.put("exception", e.getClass());
		return new ResponseEntity<>(json, HttpStatus.INTERNAL_SERVER_ERROR);
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
