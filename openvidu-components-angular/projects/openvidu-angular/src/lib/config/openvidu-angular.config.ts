export interface OpenViduAngularConfig {
	production?: boolean,
	participantFactory?: ParticipantFactoryFunction,

}

export type ParticipantFactoryFunction = (connWrapper: any, participantId: string) => any;