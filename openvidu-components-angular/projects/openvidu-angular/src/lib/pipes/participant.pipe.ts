import { Pipe, PipeTransform } from '@angular/core';
import { StreamModel, ParticipantAbstractModel } from '../models/participant.model';

@Pipe({ name: 'streams', pure: true })
export class ParticipantStreamsPipe implements PipeTransform {
	constructor() {}

	transform(participants: ParticipantAbstractModel[] | ParticipantAbstractModel): StreamModel[] {
		let streams: StreamModel[] = [];
		console.log('STREAM PIPE')
		debugger
		if(Object.keys(participants).length > 0){
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

@Pipe({ name: 'streamTypesEnabled', pure: false })
export class StreamTypesEnabledPipe implements PipeTransform {
	constructor() {}

	transform(participant: ParticipantAbstractModel): string {
		return `(${participant?.getConnectionTypesActive().toString().replace(',', ', ')})`;
	}
}
