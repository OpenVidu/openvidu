import { Pipe, PipeTransform } from '@angular/core';
import { ParticipantAbstractModel, StreamModel } from '../models/participant.model';
import { TranslateService } from '../services/translate/translate.service';

@Pipe({ name: 'streams' })
export class ParticipantStreamsPipe implements PipeTransform {
	constructor() {}

	transform(participants: ParticipantAbstractModel[] | ParticipantAbstractModel): StreamModel[] {
		let streams: StreamModel[] = [];
		if(participants && Object.keys(participants).length > 0){
			if (Array.isArray(participants)) {
				streams = participants.map(p => p.getAvailableConnections()).flat();
			} else {
				streams = participants.getAvailableConnections();
			}
		}
		return streams;
	}
}

/**
 * @internal
 */
@Pipe({ name: 'streamTypesEnabled' })
export class StreamTypesEnabledPipe implements PipeTransform {
	constructor(private translateService: TranslateService) {}

	transform(participant: ParticipantAbstractModel): string {

		const activeStreams = participant?.getActiveConnectionTypes() ?? [];
		const streamNames = activeStreams.map(streamType => this.translateService.translate(`PANEL.PARTICIPANTS.${streamType}`));
		const streamsString = streamNames.join(', ');

		return `(${streamsString})`;
	}
}
