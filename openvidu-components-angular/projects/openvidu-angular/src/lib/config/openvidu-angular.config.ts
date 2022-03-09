export interface OpenViduAngularConfig {
	production?: boolean,
	participantFactory?: ParticipantFactoryFunction,
	webcomponent?: boolean

}

export type ParticipantFactoryFunction = (connWrapper: any, participantId: string) => any;