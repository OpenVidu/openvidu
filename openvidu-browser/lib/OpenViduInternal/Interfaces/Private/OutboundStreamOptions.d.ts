import { PublisherProperties } from '../Public/PublisherProperties';
export interface OutboundStreamOptions {
    publisherProperties: PublisherProperties;
    mediaConstraints: MediaStreamConstraints;
}
