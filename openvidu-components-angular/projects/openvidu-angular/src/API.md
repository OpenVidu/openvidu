
 ## OpenVidu Components API

 ### STRUCTURAL DIRECTIVES

 - ovParticipantPanelItemElements

 ```javascript
<div *ovParticipantPanelItemElements>
	<p>EXTRA INFO</p>
</div>
 ```

 ```javascript
<div *ovParticipantPanelItemElements="let participant">
	<p>N: {{participant?.nickname}}</p>
</div>
```


 ### Videoconference component

#### Parameters:

- sessionName: The session id of your custom session
- participantName
- tokens: The webcam and screen tokens

#### UI Params

#### Videoconference Component



|      **Parameter**      	|                                 **Description**                                	|               **Value**              	|
|:-----------------------:	|:------------------------------------------------------------------------------:	|:------------------------------------:	|
|         minimal         	|         Applies a minimal UI. Hide all controls except for cam and mic.        	| true \| fase<br>Default value: _**false**_ 	|
|         prejoin         	|         Show/hide the prejoin page for selecting media devices.               	| true \| fase<br>Default value: _**true**_ 	|
|        videoMuted       	|            Participant joins the session with camera muted/unmuted.            	| true \| fase<br>Default value: _**false**_ 	|
|        audioMuted       	|          Participant joins the session with microphone muted/unmuted.          	| true \| fase<br>Default value: _**false**_ 	|
|    toolbarScreenshareButton    	|                        Show/hide the screenshare button.                       	|  true \| fase<br>Default value: _**true**_ 	|
|     toolbarFullscreenButton    	|                        Show/hide the fullscreen button.                        	|  true \| fase<br>Default value: _**true**_ 	|
|       toolbarLeaveButton       	|                           Show/hide the leave button.                          	|  true \| fase<br>Default value: _**true**_ 	|
toolbarChatPanelButton     	|         Show/hide the chat panel button. It also applies to chat panel         	|  true \| fase<br>Default value: _**true**_ 	|
| toolbarParticipantsPanelButton 	| Show/hide the participants panel button. It also applies to participants panel 	|  true \| fase<br>Default value: _**true**_ 	|
|       toolbarDisplayLogo       	|                            Set display toolbar logo                            	|  true \| fase<br>Default value: _**true**_ 	|
|    toolbarDisplaySessionName   	|                            Set display session name                            	|  true \| fase<br>Default value: _**true**_ 	|
|  streamDisplayParticipantName 	|               Show/hide the participants name in stream component              	|  true \| fase<br>Default value: true 	|
|  streamDisplayAudioDetection  	|          Show/hide the participant audio detection in stream component         	|  true \| fase<br>Default value: true 	|
|      streamSettingsButton     	|          Show/hide the participant settings button in stream component         	|  true \| fase<br>Default value: true 	|
|  participantPanelItemMuteButton |               Show/hide the mute button in participants panel item              	|  true \| fase<br>Default value: true 	|



#### Toolbar Component



|      **Parameter**      	|                                 **Description**                                	|               **Value**              	|
|:-----------------------:	|:------------------------------------------------------------------------------:	|:------------------------------------:	|
|    screenshareButton    	|                        Show/hide the screenshare button.                       	|  true \| fase<br>Default value: _**true**_ 	|
|     fullscreenButton    	|                        Show/hide the fullscreen button.                        	|  true \| fase<br>Default value: _**true**_ 	|
|       leaveButton       	|                           Show/hide the leave button.                          	|  true \| fase<br>Default value: _**true**_ 	|
|     chatPanelButton     	|         Show/hide the chat panel button. It also applies to chat panel         	|  true \| fase<br>Default value: _**true**_ 	|
| participantsPanelButton 	| Show/hide the participants panel button. It also applies to participants panel 	|  true \| fase<br>Default value: _**true**_ 	|
|       displayLogo       	|                            Set display toolbar logo                            	|  true \| fase<br>Default value: _**true**_ 	|
|    displaySessionName   	|                            Set display session name                            	|  true \| fase<br>Default value: _**true**_ 	|


#### Stream Component



|      **Parameter**      	|                                 **Description**                                	|               **Value**              	|
|:-----------------------:	|:------------------------------------------------------------------------------:	|:------------------------------------:	|
|  displayParticipantName 	|               Show/hide the participants name in stream component              	|  true \| fase<br>Default value: true 	|
|  displayAudioDetection  	|          Show/hide the participant audio detection in stream component         	|  true \| fase<br>Default value: true 	|
|      settingsButton     	|          Show/hide the participant settings button in stream component         	|  true \| fase<br>Default value: true 	|

#### Participant Panel Item Component
|      **Parameter**      	|                                 **Description**                                	|               **Value**              	|
|:-----------------------:	|:------------------------------------------------------------------------------:	|:------------------------------------:	|
|  muteButton 	|               Show/hide the mute button in participants panel item              	|  true \| fase<br>Default value: true 	|


 #### Events:
    - onJoinButtonClicked
    - onToolbarLeaveButtonClicked
    - onToolbarCameraButtonClicked
    - onToolbarMicrophoneButtonClicked
    - onToolbarScreenshareButtonClicked
    - onToolbarParticipantsPanelButtonClicked
    - onToolbarChatPanelButtonClicked
    - onToolbarFullscreenButtonClicked
    - onSessionCreated => Session


#### How can I replace the OpenVidu logo?

If you want to customize and replace the OpenVidu Logo you only have to add under `assets/images` directory your logo file. The name must be `logo.png` and it must be a .png image.

#### How can I customize the styles?

You only have to add the following css code on your css app root file and modify customize all you want:

```scss
// Custom openvidu-components styles
:root {
  --ov-primary-color: #303030;
  --ov-secondary-color: #586063;
  --ov-tertiary-color: #598eff;
  --ov-warn-color: #EB5144;
  --ov-accent-color: #ffae35;

  --ov-dark-color: #1d1d1d;
  --ov-dark-light-color: #43484A;

  --ov-light-color: #ffffff;
  --ov-light-dark-color: #f1f1f1;

  --ov-buttons-radius: 50%; // border-radius property
  --ov-leave-button-radius: 10px;
  --ov-video-radius: 5px;
  --ov-panel-radius: 5px;
}
```