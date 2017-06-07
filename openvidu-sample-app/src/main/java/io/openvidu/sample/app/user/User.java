package io.openvidu.sample.app.user;

import java.util.List;
import java.util.Set;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;

import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.ElementCollection;
import javax.persistence.Id;
import javax.persistence.ManyToMany;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import com.fasterxml.jackson.annotation.JsonIgnore;

import io.openvidu.sample.app.lesson.Lesson;

@Entity
public class User {
	
	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	private long id;

	private String name;
	
	private String nickName;

	@JsonIgnore
	private String passwordHash;

	@ElementCollection(fetch = FetchType.EAGER)
	private List<String> roles;
	
	//It is ignored in order to avoid infinite recursiveness
	//This makes necessary another interaction with the database (after login to retrieve the lessons of the user)
	@JsonIgnore
	@ManyToMany(mappedBy="attenders")
	private Set<Lesson> lessons;

	public User() {}
	
	public User(String name, String password, String nickName, String... roles){
		this.name = name;
		this.passwordHash = new BCryptPasswordEncoder().encode(password);
		this.roles = new ArrayList<>(Arrays.asList(roles));
		this.nickName = nickName;
		this.lessons = new HashSet<>();
	}
	
	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getPasswordHash() {
		return passwordHash;
	}

	public void setPasswordHash(String passwordHash) {
		this.passwordHash = passwordHash;
	}

	public List<String> getRoles() {
		return roles;
	}

	public void setRoles(List<String> roles) {
		this.roles = roles;
	}

	public String getNickName() {
		return nickName;
	}

	public void setNickName(String nickName) {
		this.nickName = nickName;
	}

	public Set<Lesson> getLessons() {
		return lessons;
	}

	public void setLessons(Set<Lesson> lessons) {
		this.lessons = lessons;
	}
	
	@Override
	public boolean equals(Object other){
	    if (other == null) return false;
	    if (other == this) return true;
	    if (!(other instanceof User))return false;
	    User otherUser = (User)other;
	    return ((otherUser.id == this.id) && (otherUser.name.equals(this.name)));
	}
	
	@Override
	public int hashCode() {
	    return name.hashCode();
	}

}
