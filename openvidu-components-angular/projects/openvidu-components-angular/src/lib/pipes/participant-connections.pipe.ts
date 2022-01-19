import { Pipe, PipeTransform } from '@angular/core';
import { ConnectionWrapper, ParticipantAbstractModel } from '../models/participant.model';

@Pipe({ name: 'connections' })
export class ParticipantConnectionsPipe implements PipeTransform {
	constructor() {}

	transform(participants: ParticipantAbstractModel[] | ParticipantAbstractModel): ConnectionWrapper[] {
		let connections: ConnectionWrapper[] = [];
		if (Array.isArray(participants)) {
			participants.forEach((p) => {
				connections = connections.concat(Array.from(p.connections.values()));
			});
		} else {
			connections = Array.from(participants.connections.values());
		}
		return connections;
	}
}

@Pipe({ name: 'connectionsEnabled', pure: false })
export class ConnectionsEnabledPipe implements PipeTransform {
	constructor() {}

	transform(participant: ParticipantAbstractModel): string {
		return `(${participant.getConnectionTypesEnabled().toString().replace(',', ', ')})`;
	}
}

@Pipe({ name: 'nickname', pure: false })
export class NicknamePipe implements PipeTransform {
	constructor() {}
	transform(participant: ParticipantAbstractModel): string {
		return participant.getCameraNickname();
	}
}
