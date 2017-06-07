package io.openvidu.sample.app.lesson;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

import org.apache.commons.validator.routines.EmailValidator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import io.openvidu.sample.app.user.User;
import io.openvidu.sample.app.user.UserComponent;
import io.openvidu.sample.app.user.UserRepository;

@RestController
@RequestMapping("/api-lessons")
public class LessonController {
	
	@Autowired
	private LessonRepository lessonRepository;
	
	@Autowired
	private UserRepository userRepository;
	
	@Autowired
	private UserComponent user;
	
	private class AddAttendersResponse {
		public Collection<User> attendersAdded;
		public Collection<User> attendersAlreadyAdded;
		public Collection<String> emailsInvalid;
		public Collection<String> emailsValidNotRegistered;
	}
	
	@RequestMapping(value = "/user/{id}", method = RequestMethod.GET)
	public ResponseEntity<Collection<Lesson>> getLessons(@PathVariable(value="id") String id){
		if (!this.userIsLogged()){
			return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
		}
		
		long id_i = -1;
		try{
			id_i = Long.parseLong(id);
		}catch(NumberFormatException e){
			return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
		}
		Set<Long> s = new HashSet<>();
		s.add(id_i);
		Collection<User> users = userRepository.findAll(s);
		Collection<Lesson> lessons = new HashSet<>();
		lessons = lessonRepository.findByAttenders(users);
		return new ResponseEntity<>(lessons ,HttpStatus.OK);
	}
	
	
	
	@RequestMapping(value = "/lesson/{id}", method = RequestMethod.GET)
	public ResponseEntity<Lesson> getLesson(@PathVariable(value="id") String id){
		if (!this.userIsLogged()){
			return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
		}
		
		long id_i = -1;
		try{
			id_i = Long.parseLong(id);
		}catch(NumberFormatException e){
			return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
		}
		Lesson lesson = lessonRepository.findOne(id_i);
		return new ResponseEntity<>(lesson ,HttpStatus.OK);
	}
	
	
	
	@RequestMapping(value = "/new", method = RequestMethod.POST)
	public ResponseEntity<Lesson> newLesson(@RequestBody Lesson lesson) {
		if (!this.userIsLogged()){
			return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
		}
		
		User userLogged = user.getLoggedUser();
		
		if (!user.hasRoleTeacher()){
			// Students are not authorized to add new lessons
			return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
		}
		
		// Updating lesson ('teacher', 'attenders')
		lesson.setTeacher(userLogged);
		lesson.getAttenders().add(userLogged);
		
		// Saving lesson
		lessonRepository.save(lesson);
		lessonRepository.flush();
		
		lesson = lessonRepository.findOne(lesson.getId());
		return new ResponseEntity<>(lesson, HttpStatus.CREATED);
	}
	
	
	
	@RequestMapping(value = "/edit", method = RequestMethod.PUT)
	public ResponseEntity<Lesson> modifyLesson(@RequestBody Lesson lesson) {
		if (!this.userIsLogged()){
			return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
		}

		Lesson c = lessonRepository.findOne(lesson.getId());
		
		checkAuthorization(c, c.getTeacher());
		
		//Modifying the lesson attributes
		c.setTitle(lesson.getTitle());
		
		//Saving the modified lesson
		lessonRepository.save(c);
		return new ResponseEntity<>(c, HttpStatus.OK);
	}
	
	
	
	@RequestMapping(value = "/delete/{lessonId}", method = RequestMethod.DELETE)
	public ResponseEntity<Lesson> deleteLesson(@PathVariable(value="lessonId") String lessonId) {
		if (!this.userIsLogged()){
			return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
		}
		
		long id_lesson = -1;
		try{
			id_lesson = Long.parseLong(lessonId);
		}catch(NumberFormatException e){
			return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
		}
		
		Lesson c = lessonRepository.findOne(id_lesson);
		
		checkAuthorization(c, c.getTeacher());
		
		//Removing the deleted lesson from its attenders
		Collection<Lesson> lessons = new HashSet<>();
		lessons.add(c);
		Collection<User> users = userRepository.findByLessons(lessons);
		for(User u: users){
			u.getLessons().remove(c);
		}
		userRepository.save(users);
		c.getAttenders().clear();
		
		lessonRepository.delete(c);
		return new ResponseEntity<>(c, HttpStatus.OK);
	}
	

	
	@RequestMapping(value = "/edit/add-attenders/lesson/{lessonId}", method = RequestMethod.PUT)
	public ResponseEntity<AddAttendersResponse> addAttenders(
			@RequestBody String[] attenderEmails, 
			@PathVariable(value="lessonId") String lessonId) 
	{
		
		if (!this.userIsLogged()){
			return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
		}
		
		long id_lesson = -1;
		try{
			id_lesson = Long.parseLong(lessonId);
		}catch(NumberFormatException e){
			return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
		}

		Lesson c = lessonRepository.findOne(id_lesson);
		
		checkAuthorization(c, c.getTeacher());
		
		//Strings with a valid email format
		Set<String> attenderEmailsValid = new HashSet<>();
		//Strings with an invalid email format
		Set<String> attenderEmailsInvalid = new HashSet<>();
		//Strings with a valid email format but no registered in the application
		Set<String> attenderEmailsNotRegistered = new HashSet<>();
		
		EmailValidator emailValidator = EmailValidator.getInstance();
		
		for (int i = 0; i < attenderEmails.length; i++){
			if (emailValidator.isValid(attenderEmails[i])) {
				attenderEmailsValid.add(attenderEmails[i]);
			} else {
				attenderEmailsInvalid.add(attenderEmails[i]);
			}
		}
		
		Collection<User> newPossibleAttenders = userRepository.findByNameIn(attenderEmailsValid);
		Collection<User> newAddedAttenders = new HashSet<>();
		Collection<User> alreadyAddedAttenders = new HashSet<>();
		
		for (String s : attenderEmailsValid){
			if (!this.userListContainsEmail(newPossibleAttenders, s)){
				attenderEmailsNotRegistered.add(s);
			}
		}
		
		for (User attender : newPossibleAttenders){
			boolean newAtt = true;
			if (!attender.getLessons().contains(c)) attender.getLessons().add(c); else newAtt = false;
			if (!c.getAttenders().contains(attender)) c.getAttenders().add(attender); else newAtt = false;
			if (newAtt) newAddedAttenders.add(attender); else alreadyAddedAttenders.add(attender);
		}
		
		//Saving the attenders (all of them, just in case a field of the bidirectional relationship is missing in a Lesson or a User)
		userRepository.save(newPossibleAttenders);	
		//Saving the modified lesson
		lessonRepository.save(c);
		
		AddAttendersResponse customResponse = new AddAttendersResponse();
		customResponse.attendersAdded = newAddedAttenders;
		customResponse.attendersAlreadyAdded = alreadyAddedAttenders;
		customResponse.emailsInvalid = attenderEmailsInvalid;
		customResponse.emailsValidNotRegistered = attenderEmailsNotRegistered;
		
		return new ResponseEntity<>(customResponse, HttpStatus.OK);
	}
	
	
	
	@RequestMapping(value = "/edit/delete-attenders", method = RequestMethod.PUT)
	public ResponseEntity<Set<User>> deleteAttenders(@RequestBody Lesson lesson) {
		if (!this.userIsLogged()){
			return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);
		}

		Lesson c = lessonRepository.findOne(lesson.getId());
		
		checkAuthorization(c, c.getTeacher());
		
		Set<Lesson> setLesson = new HashSet<>();
		setLesson.add(c);
		Collection<User> lessonAttenders = userRepository.findByLessons(setLesson);
		
		for (User attender : lessonAttenders){
			if (!lesson.getAttenders().contains(attender)){
				attender.getLessons().remove(c);
			}
		}
		
		userRepository.save(lessonAttenders);
		
		//Modifying the lesson attenders
		c.setAttenders(lesson.getAttenders());
		//Saving the modified lesson
		lessonRepository.save(c);
		return new ResponseEntity<>(c.getAttenders(), HttpStatus.OK);
	}
	
	
	//Login checking method for the backend
	private boolean userIsLogged(){
		if (!user.isLoggedUser()) {
			System.out.println("Not user logged");
			return false;
		}
		return true; 
	}
	
	//Authorization checking for editing and deleting lessons (the teacher must own the Lesson)
	private ResponseEntity<Object> checkAuthorization(Object o, User u){
		if(o == null){
			//The object does not exist
			return new ResponseEntity<>(HttpStatus.NOT_MODIFIED);
		}
		if(!this.user.getLoggedUser().equals(u)){
			//The teacher is not authorized to edit it if he is not its owner
			return new ResponseEntity<>(HttpStatus.UNAUTHORIZED); 
		}
		return null;
	}
	
	//Checks if a User collection contains a user with certain email
	private boolean userListContainsEmail(Collection<User> users, String email){
		boolean isContained = false;
		for (User u : users){
			if (u.getName().equals(email)) {
				isContained = true;
				break;
			}
		}
		return isContained;
	}
	
}

	
	
