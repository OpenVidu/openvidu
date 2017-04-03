package openvidu.openvidu_sample_app.lesson;

import java.util.Collection;

import org.springframework.data.jpa.repository.JpaRepository;

import openvidu.openvidu_sample_app.user.User;

public interface LessonRepository extends JpaRepository<Lesson, Long> {
	
    public Collection<Lesson> findByAttenders(Collection<User> users);

}
