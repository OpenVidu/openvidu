import { Pipe, PipeTransform } from '@angular/core';
import { StreamModel, ParticipantAbstractModel } from '../models/participant.model';

@Pipe({ name: 'streams' })
export class ParticipantStreamsPipe implements PipeTransform {
	constructor() {}

	transform(participants: ParticipantAbstractModel[] | ParticipantAbstractModel): StreamModel[] {
		let streams: StreamModel[] = [];
		if (Array.isArray(participants)) {
			participants.forEach((p) => {
				streams = streams.concat(Array.from(p.streams.values()));
			});
		} else {
			streams = Array.from(participants.streams.values());
		}
		return streams;
	}
}

@Pipe({ name: 'streamsEnabled', pure: false })
export class StreamsEnabledPipe implements PipeTransform {
	constructor() {}

	transform(participant: ParticipantAbstractModel): string {
		return `(${participant?.getConnectionTypesActive().toString().replace(',', ', ')})`;
	}
}
