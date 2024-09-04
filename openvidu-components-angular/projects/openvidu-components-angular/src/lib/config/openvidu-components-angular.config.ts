import { ParticipantProperties } from '../models/participant.model';

export interface OpenViduComponentsConfig {
	production?: boolean;
	participantFactory?: ParticipantFactoryFunction;
	services?: any;
}

export type ParticipantFactoryFunction = (props: ParticipantProperties) => any;
