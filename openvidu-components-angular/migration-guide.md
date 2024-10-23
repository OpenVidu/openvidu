## OpenVidu Angular 3.0.0 Migration Guide

1. **Introduction**

Mejoras:

publicacion de multiples tracks por participante

Desventajas

Backgrounds no existe en openvidu 3.0.0
Captions no existe en openvidu 3.0.0

2. **Updating Dependencies**

OpenVidu Components 2.x was developed using Angular 14. Now, this version 3 is developed with Angular 15. This means that you will need to update your Angular version to 15.0.0 or higher. Check Angular Migration Guide for more information: https://update.angular.io/

Install the new version of OpenVidu Components:

```bash
npm install openvidu-components-angular@3.0.0
```

3.  **Source Code Migration**

    #### Components

    -   #### ActivitiesPanelComponent (`ov-activities-panel`):

        ##### Events / `@Output`

        ##### API Directives / `@Input`

    -   #### BroadcastingActivityComponent (`ov-broadcasting-activity`):

        ##### Events / `@Output`

        -   `onBroadcastingStartRequested` (Describe onBroadcastingStartRequested event here)
        -   `onRecordingPlayClicked` (Describe onRecordingPlayClicked event here)

        ##### API Directives / `@Input`

        -   `broadcastingError` has been deleted

    -   #### ChatPanelComponent (`ov-chat-panel`):

        ##### Events / `@Output`

        ##### API Directives / `@Input`

    -   #### LayoutComponent (`ov-layout`):

        ##### Events / `@Output`

        ##### API Directives / `@Input`

    -   #### PanelComponent (`ov-panel`):

        ##### Events / `@Output`

        ##### API Directives / `@Input`

    -   #### ParticipantPanelItemComponent (`ov-participant-panel-item`):

        ##### Events / `@Output`

        ##### API Directives / `@Input`

    -   #### ParticipantsPanelComponent (`ov-participants-panel`):

        ##### Events / `@Output`

        ##### API Directives / `@Input`

    -   #### RecordingActivityComponent (`ov-recording-activity`):

        ##### Events / `@Output`

        -   `onRecordingStartRequested` (Describe onRecordingStartRequested event here)
        -   `onRecordingStopRequested` (Describe onRecordingStopRequested event here)

        ##### API Directives / `@Input`

        -   `recordingError` has been deleted
        -   `recordingsList` has been deleted

    -   #### StreamComponent (`ov-stream`):

        ##### Events / `@Output`

        ##### API Directives / `@Input`

        -   `settingsButton` has been replaced by `videoControls`
        -   `stream` input has been replaced by `track` input. Check the [Pipes](#pipes) section for more information.

    -   #### ToolbarComponent (`ov-toolbar`):

        ##### Events / `@Output`

        -   `backgroundEffectsButton` has been deleted **TODO: Try to add it again!!**
        -   `captionsButton` has been deleted
        -   `displaySessionName` has been renamed to `displayRoomName`

        ##### API Directives / `@Input`

    -   #### VideoconferenceComponent (`ov-videoconference`):

        ##### Events / `@Output`

        -   `onActivitiesPanelDeleteRecordingClicked` has been replaced by `onRecordingDeleteRequested`
        -   `onActivitiesPanelForceRecordingUpdate` has been deleted
        -   `onActivitiesPanelPlayRecordingClicked` has been replaced by `onRecordingPlayClicked`
        -   `onActivitiesPanelStartBroadcastingClicked` have been replaced by `onBroadcastingStartRequested`
        -   `onActivitiesPanelStartRecordingClicked` and `onToolbarStartRecordingClicked` has been replaced by `onRecordingStartRequested`
        -   `onActivitiesPanelStopBroadcastingClicked` and `onToolbarStopBroadcastingClicked` has been replaced by `onBroadcastingStopRequested`
        -   `onActivitiesPanelStopRecordingClicked` and `onToolbarStopRecordingClicked` has been replaced by `onRecordingStopRequested`
        -   **// TODO: langChanged**
        -   `onNodeCrashed` has been deleted
        -   `onSessionCreated` has been replaced by `onRoomCreated`
        -   `onToolbarActivitiesPanelButtonClicked` has been replaced by `onActivitiesPanelStatusChanged`
        -   `onToolbarCameraButtonClicked` has been replaced by `onVideoEnabledChanged`
        -   `onToolbarChatPanelButtonClicked` has been replaced by `onChatPanelStatusChanged`
        -   `onToolbarFullscreenButtonClicked` has been replaced by `onFullscreenEnabledChanged`
        -   `onToolbarLeaveButtonClicked` has been replaced by `onRoomDisconnected`
        -   `onToolbarMicrophoneButtonClicked` has been replaced by `onAudioEnabledChanged`
        -   `onToolbarParticipantsPanelButtonClicked` has been replaced by `onParticipantsPanelStatusChanged`
        -   `onToolbarScreenshareButtonClicked` has been replaced by `onScreenShareEnabledChanged`
        -   `onSettingsPanelStatusChanged` has been added to notify when the settings panel status has changed
        -   `onTokenRequested` has been added to notify when a token need to be created
        -   `onVideoDeviceChanged` has been added to notify when the video device has changed
        -   `onAudioDeviceChanged` has been added to notify when the audio device has changed
        -   `onRecordingDownloadClicked` has been added to notify when the user clicks on the download button of a recording
        -   `onActivitiesPanelPlayRecordingClicked` has been replaced by `onRecordingPlayClicked`

    -   #### Admin Login (`ov-admin-login`):
        - `onLoginButtonClicked` returns an object with the username and password instead of a secret string

        ##### API Directives / `@Input`

        -   `audioMuted` has been replaced by `audioEnabled`
        -   `broadcastingActivityBroadcastingError` has been deleted
        -   `captionsLang` has been deleted
        -   `captionsLangOptions` has been deleted
        -   `recordingActivityRecordingError` has been deleted
        -   `recordingActivityRecordingsList` has been deleted
        -   `streamSettingsButton` has been replaced by `streamVideoControls`
        -   `toolbarBackgroundEffectsButton` has been deleted **TODO: Try to add it again!!**
        -   `toolbarCaptionsButton` has been deleted
        -   `toolbarDisplaySessionName` has been renamed to `toolbarDisplayRoomName`
        -   `videoMuted` has been replaced by `videoEnabled`

    #### Web Component

    Apply the same Outputs and Inputs changes as in the VideoconferenceComponent

    #### Pipes

    -   `stream` has been replaced by `track`

        In version 2.X of openvidu-angular, the **ParticipantStreamsPipe** (`streams`) was employed to extract streams from both the local participant and remote participants' lists. Its purpose was to inject these streams into the **StreamComponent** (`ov-stream`).

        However, in the current version (3.0.0), **StreamComponent** now requires direct access to participant tracks. Consequently, the `streams` pipe has been replaced by the **RemoteParticipantTracksPipe** (`tracks`), exclusively used for remote participants' lists. Local participant tracks can now be obtained directly from the track accessor of the `ParticipantModel` class. This accessor and pipe return an array of [`ParticipantTrackPublication`](#/interfaces/ParticipantTrackPublication.html) objects, simplifying the handling of tracks.

        ##### In v2.X (using `streams` pipe):

        ```html
        <div class="item" *ngFor="let stream of localParticipant | streams">
        	<ov-stream [stream]="stream"></ov-stream>
        </div>
        <div class="item" *ngFor="let stream of remoteParticipants | streams">
        	<ov-stream [stream]="stream"></ov-stream>
        </div>
        ```

        ##### In v3.0.0 (using `tracks` pipe):

        ```html
        <div *ngFor="let track of localParticipant.tracks">
        	<ov-stream [track]="track"></ov-stream>
        </div>
        <div *ngFor="let track of remoteParticipants | tracks">
        	<ov-stream [track]="track"></ov-stream>
        </div>
        ```

    #### Services

    -   ##### Broadcasting Service (`BroadcastingService`):

        -   `broadcastingStatusObs` observable now pushes an [BroadcastingStatusInfo](#/interfaces/BroadcastingStatusInfo.html) object instead of an `BroadcastingStatus` in every update.
        -   `startBroadcasting` method has been replaced by `setBroadcastingStarting`
        -   `stopBroadcasting` method has been replaced by `setBroadcastingStopping`
        -   `updateStatus` method has been deleted. Now the status is updated automatically when the status changes.

        You can check the [BroadcastingService](#/services/BroadcastingService.html) documentation for more information.

    -   ##### OpenVidu Service (`OpenViduService`):

        -   `disconnect` method has been renamed to `disconnectRoom`
        -   `getRemoteConnections` method has been moved to [ParticipantService](#participant-service-participantservice) and renamed to `getRemoteParticipants`.
        -   `getSession` method has been renamed to `getRoom`.
        -   `isSessionConnected` method has been renamed to `isRoomConnected`.
        -   `publishCamera` and `unpublishCamera` methods have been moved to [ParticipantService](#participant-service-participantservice) and renamed to `setCameraEnabled`
        -   `publishScreen` and `unpublishScreen` methods have been renamed to `setScreenShareEnabled`
        -   `isSttReadyObs` observable has been deleted
        -   `connectRoom` method has been added
        -   `getRoomName` method has been added to get the name of the room

    -   ##### Panel Service (`PanelService`):

        -   `panelOpenedObs` observable has been renamed to `panelStatusObs` which returns a [PanelStatusInfo](#/interfaces/PanelStatusInfo.html) object instead of a `PanelEvent` in every update.
        -   `isBackgroundEffectsPanelOpened` method has been deleted

        You can check the [PanelService](#/services/PanelService.html) documentation for more information.

    -   ##### Participant Service (`ParticipantService`):

        -   `amIModerator` method has been renamed to `amIRoomAdmin`
        -   `toggleScreenshare` method has been renamed to `switchScreenShare`
        -   `isMyVideoActive` method has been renamed to `isMyCameraEnabled`
        -   `isMyAudioActive` method has been renamed to `isMyMicrophoneEnabled`
        -   `publishVideo` method has been renamed to `setCameraEnabled`
        -   `publishAudio` method has been renamed to `setMicrophoneEnabled`

        You can check the [ParticipantService](#/services/ParticipantService.html) documentation for more information.

    -   ##### Recording Service (`RecordingService`):

        -   `recordingStatusObs` observable now pushes an [RecordingStatusInfo](#/interfaces/RecordingStatusInfo.html) object instead of an `RecordingStatus` in every update.
        -   `forceUpdateRecordings` method has been deleted. Now the recordings are updated automatically when the status changes.
        -   `updateStatus` method has been deleted. Now the status is updated automatically when the status changes.

        You can check the [RecordingService](#/services/RecordingService.html) documentation for more information.

    #### Models

    -   `ParticipantAbstracModel` has been renamed to `ParticipantModel`. In addition, the `ParticipantModel` class has been refactored and now it has a new property called `tracks` that contains all the tracks of the participant. This property is an array of `ParticipantTrackPublication` objects.

    -   `StreamModel` has been renamed to `ParticipantTrackPublication`.

    #### Interfaces

    -   `BroadcastingError` has been deleted
    -   `CaptionsLangOptions` has been deleted
    -   `PanelEvent` has been renamed to `PanelStatusInfo`
    -   `StreamModel` has been renamed to `ParticipantTrackPublication`
    -   `TokenModel` has been deleted

4.  **References and Additional Resources**

5.  **FAQ (Frequently Asked Questions)**

    #### **Why should I migrate to version 3.0.0 of OpenVidu Angular?**

    **TODO**

    **Which versions of Angular are compatible with OpenVidu Angular 3.0.0?**

    OpenVidu Angular 3.0.0 is compatible with Angular 15 and later versions. Make sure to update your Angular project to version 15 or higher to use this version of OpenVidu Angular.

    #### **How can I check the current version of Angular in my project?**

    You can check the current version of Angular in your project by running the following command in your terminal:

    ```
    ng version
    ```

    This will provide you with detailed information about the version of Angular you are using in your project.

    #### **Where can I find examples of using the new features and API changes?**

    You can find examples of using the new features and API changes in the official documentation of OpenVidu Angular 3.0.0. Visit the [official tutorials](#).

    #### **How can I contribute or report issues with the new version?**

    If you wish to contribute to the development of OpenVidu Angular or report issues, you can do so through the collaborative development platform, such as GitHub. Visit the official repository at [OpenVidu Angular repository](#) for information on how to contribute and how to report issues. Your participation is valuable in improving the library and assisting other users.

6.  **Support and Community**
