import { Component, Input } from '@angular/core';
import { AudioTrack, VideoTrack } from 'livekit-client';
import { User } from '../test-scenarios/test-scenarios.component';

@Component({
    selector: 'app-users-table',
    styleUrls: ['users-table.component.css'],
    templateUrl: 'users-table.component.html',
    standalone: false
})
export class UsersTableComponent {
  @Input() users: User[] = [];

  numberOfStreamsOut() {
    return this.users.filter((u) => u.publisher).length;
  }

  numberOfStreamsIn() {
    return this.users
      .filter((u) => u.publisher)
      .reduce((acc, publisher) => {
        return (
          acc +
          this.users.filter(
            (u) =>
              u.subscriber &&
              u.room.localParticipant.identity !==
                publisher.room.localParticipant.identity
          ).length
        );
      }, 0);
  }

  filterPublishers(user: User) {
    return user.publisher;
  }

  filterSubscribers(user: User) {
    return user.subscriber;
  }

  getRemoteTracksForPublisher(
    subscriber: User,
    publisher: User
  ): { audio: AudioTrack; video: VideoTrack } | undefined {
    {
      const remoteParticipant = Array.from(
        subscriber.room.remoteParticipants.values()
      ).find(
        (remoteParticipant) =>
          remoteParticipant.identity ===
          publisher.room.localParticipant.identity
      );
      if (remoteParticipant) {
        return {
          audio: remoteParticipant.audioTrackPublications.values().next().value
            ?.track,
          video: remoteParticipant.videoTrackPublications.values().next().value
            ?.track,
        };
      } else {
        return undefined;
      }
    }
  }
}
