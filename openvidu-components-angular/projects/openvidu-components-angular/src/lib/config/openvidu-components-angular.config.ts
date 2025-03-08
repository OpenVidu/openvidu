import { ParticipantProperties } from '../models/participant.model';

export interface OpenViduComponentsConfig {
	production?: boolean;
	participantFactory?: ParticipantFactoryFunction;
}

export type ParticipantFactoryFunction = (props: ParticipantProperties) => any;
