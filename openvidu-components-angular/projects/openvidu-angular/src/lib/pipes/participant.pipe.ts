import { Pipe, PipeTransform } from '@angular/core';
import { StreamModel, ParticipantAbstractModel } from '../models/participant.model';
import { TranslateService } from '../services/translate/translate.service';

@Pipe({ name: 'streams' })
export class ParticipantStreamsPipe implements PipeTransform {
	constructor() {}

	transform(participants: ParticipantAbstractModel[] | ParticipantAbstractModel): StreamModel[] {
		let streams: StreamModel[] = [];
		if(participants && Object.keys(participants).length > 0){
			if (Array.isArray(participants)) {
				participants.forEach((p) => {
					streams = streams.concat(p.getAvailableConnections());
				});
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
		let result = '';
		let activeStreams = participant?.getConnectionTypesActive().toString();
		const activeStreamsArr: string[] = activeStreams.split(',');
		activeStreamsArr.forEach((type, index) => {
			result += this.translateService.translate(`PANEL.PARTICIPANTS.${type}`)
			if(activeStreamsArr.length > 0 && index < activeStreamsArr.length - 1){
				result += ', ';
			}
		});
		return `(${result})`;
	}
}
