Feature: Connecting To Session
  IN ORDER TO complete a bidirectional communication
  AS a regular user
  I WANT TO check the WebRTC connections between two peers

  Scenario Outline: Users connect to the same session
    Given Chrome users <chromeUsers>  and Firefox users <firefoxUsers> go to "http://localhost:5000" page with <secondsOfWait> seconds
    And users fill "participantId" input
    And users fill "sessionId" input with session name <session>
    When users click on "commit" button
    Then users should see title <session> in element with id "session-header"
    And "1" video element/s should be shown in element with id "main-video"
    And "1" video element/s in "main-video" should be playing media
    And users should see other users nicknames
		And all video elements should be shown in element with id "video-container"
		And all video elements in "video-container" should be playing media
		And <firefoxUsers> leave session
	  And <firefoxUsers> see "Join a video session" text in "h1" element
	  And <chromeUsers> div "video-container" should have <chromeUsers> videos
		And close all browsers

  Examples:
    | chromeUsers                   | firefoxUsers                | session  | secondsOfWait |
    | ['User1']                     | ['User2']                   | Session1 | 7             |
    | ['User1', 'User3']            | ['User2']                   | Session2 | 7             |
    | ['User1']                     | ['User2', 'User3']          | Session3 | 7             |
    | ['User1', 'User3']            | ['User2', 'User4']          | Session4 | 10            |    