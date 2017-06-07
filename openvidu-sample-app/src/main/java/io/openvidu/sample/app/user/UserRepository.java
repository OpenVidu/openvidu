package io.openvidu.sample.app.user;

import java.util.Collection;

import org.springframework.data.jpa.repository.JpaRepository;

import io.openvidu.sample.app.lesson.Lesson;

public interface UserRepository extends JpaRepository<User, Long>{
	
	public User findByName(String name);
	
	public Collection<User> findByNameIn(Collection<String> names);
	
	public Collection<User> findByLessons(Collection<Lesson> lessons);

}
