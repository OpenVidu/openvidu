package openvidu.openvidu_sample_app.user;

import java.util.Collection;

import org.springframework.data.jpa.repository.JpaRepository;

import openvidu.openvidu_sample_app.lesson.Lesson;

public interface UserRepository extends JpaRepository<User, Long>{
	
	public User findByName(String name);
	
	public Collection<User> findByNameIn(Collection<String> names);
	
	public Collection<User> findByLessons(Collection<Lesson> lessons);

}
