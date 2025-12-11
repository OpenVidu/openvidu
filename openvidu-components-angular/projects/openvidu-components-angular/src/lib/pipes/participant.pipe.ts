import { Pipe, PipeTransform } from '@angular/core';
import { ParticipantTrackPublication, ParticipantModel } from '../models/participant.model';
import { TranslateService } from '../services/translate/translate.service';
import { Track } from 'livekit-client';

/**
 * The **RemoteParticipantTracksPipe** allows us to get all the tracks from all remote participants.
 * This is used to display the tracks in the videoconference layout.
 * @returns {ParticipantTrackPublication[]} Array of tracks
 */
@Pipe({ name: 'tracks', standalone: true })
export class RemoteParticipantTracksPipe implements PipeTransform {
	constructor() {}

	transform(participants: ParticipantModel[]): ParticipantTrackPublication[] {
		return participants.map((p) => p.tracks).flat();
	}
}

/**
 * @internal
 */
@Pipe({ name: 'tracksPublishedTypes', standalone: true })
export class TrackPublishedTypesPipe implements PipeTransform {
	constructor(private translateService: TranslateService) {}

	transform(participant: ParticipantModel): string {
		const trackTypes = participant?.getTracksPublishedTypes() ?? [];
		const types: string[] = [];
		trackTypes.forEach((source) => {
			if (source === Track.Source.Camera) {
				types.push(this.translateService.translate('PANEL.PARTICIPANTS.CAMERA'));
			} else if (source === Track.Source.Microphone) {
				types.push(this.translateService.translate('PANEL.PARTICIPANTS.MICROPHONE'));
			} else if (source === Track.Source.ScreenShare) {
				types.push(this.translateService.translate('PANEL.PARTICIPANTS.SCREEN'));
			}
		});
		if (types.length === 0) {
			return `(${this.translateService.translate('PANEL.PARTICIPANTS.NO_STREAMS')})`;
		}
		return `(${types.join(', ')})`;
	}
}
