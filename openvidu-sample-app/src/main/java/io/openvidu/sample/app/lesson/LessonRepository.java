package io.openvidu.sample.app.lesson;

import java.util.Collection;

import org.springframework.data.jpa.repository.JpaRepository;

import io.openvidu.sample.app.user.User;

public interface LessonRepository extends JpaRepository<Lesson, Long> {
	
    public Collection<Lesson> findByAttenders(Collection<User> users);

}
