import { ParticipantProperties, StreamModel } from '../models/participant.model';

export interface OpenViduAngularConfig {
	production?: boolean,
	participantFactory?: ParticipantFactoryFunction,
	webcomponent?: boolean

}

export type ParticipantFactoryFunction = (props: ParticipantProperties, streamModel: StreamModel) => any;