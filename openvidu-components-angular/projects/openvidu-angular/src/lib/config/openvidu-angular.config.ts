import { ParticipantProperties, StreamModel } from '../models/participant.model';

export interface OpenViduAngularConfig {
	production?: boolean,
	participantFactory?: ParticipantFactoryFunction,
}

export type ParticipantFactoryFunction = (props: ParticipantProperties, streamModel: StreamModel) => any;