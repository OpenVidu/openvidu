package io.openvidu.sample.app;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Controller;

import io.openvidu.sample.app.lesson.Lesson;
import io.openvidu.sample.app.lesson.LessonRepository;
import io.openvidu.sample.app.user.User;
import io.openvidu.sample.app.user.UserRepository;

@Controller
public class DatabaseInitializer implements CommandLineRunner {
	
	@Autowired
	private UserRepository userRepository;
	
	@Autowired
	private LessonRepository lessonRepository;
	
	@Override
	public void run(String... args) throws Exception {
		
		//Sample users
		User user1 = new User("student1@gmail.com", "pass", "Student Imprudent", "ROLE_STUDENT");
		User user2 = new User("student2@gmail.com", "pass", "Student Concludent", "ROLE_STUDENT");
		User user3 = new User("teacher@gmail.com",  "pass", "Teacher Cheater", "ROLE_TEACHER");
		
		//Saving users
		userRepository.save(user1);
		userRepository.save(user2);
		userRepository.save(user3);
		
		//Sample lessons
		Lesson c1 = new Lesson("Lesson number 1", user3);
		Lesson c2 = new Lesson("Lesson number 2", user3);
		
		c1.getAttenders().add(user1);
		c1.getAttenders().add(user2);
		c1.getAttenders().add(user3);
		
		c2.getAttenders().add(user1);
		c2.getAttenders().add(user3);
		
		//Saving lessons
		lessonRepository.save(c1);
		lessonRepository.save(c2);
	}

}
