package io.openvidu.sample.app.user;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import org.apache.commons.validator.routines.EmailValidator;


@RestController
@RequestMapping("/api-users")
public class UserController {
	
	@Autowired
	private UserRepository userRepository;
	
	//userData: [name, pass, nickName, role]
	@RequestMapping(value = "/new", method = RequestMethod.POST)
	public ResponseEntity<User> newUser(@RequestBody String[] userData) throws Exception {
		
		System.out.println("Signing up a user...");
		
		//If the email is not already in use
		if(userRepository.findByName(userData[0]) == null) {
			
			//If the email has a valid format
			if (EmailValidator.getInstance().isValid(userData[0])){
				String role = (String) userData[3];
				System.out.println("Email and password are valid. Role of the new user: " + role);
				if(role == null){
					userData[3] = "ROLE_STUDENT";
				} else if (role.equals("teacher")) {
					userData[3] = "ROLE_TEACHER";
				} else {
					userData[3] = "ROLE_STUDENT";
				}
				User newUser = new User(userData[0], userData[1], userData[2], userData[3]);
				userRepository.save(newUser);
				return new ResponseEntity<>(newUser, HttpStatus.CREATED);
			}
			else {
				System.out.println("Email NOT valid");
				return new ResponseEntity<>(HttpStatus.FORBIDDEN);
			}
			
		} else {
			System.out.println("Email already in use");
			return new ResponseEntity<>(HttpStatus.CONFLICT);
		}
	}

}
