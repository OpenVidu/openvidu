export enum OpenViduRole {
	SUBSCRIBER = 'SUBSCRIBER',	// Can subscribe to published streams of other users
	PUBLISHER = 'PUBLISHER',	// SUBSCRIBER permissions + can subscribe to published streams of other users and publish their own streams
	MODERATOR = 'MODERATOR'		// SUBSCRIBER + PUBLIHSER permissions + can force unpublish() and disconnect() over a third-party stream or user
}