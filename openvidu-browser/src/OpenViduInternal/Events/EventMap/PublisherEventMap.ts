import { StreamEvent } from '../StreamEvent';
import { StreamManagerEventMap } from './StreamManagerEventMap';

export interface PublisherEventMap extends StreamManagerEventMap {
    streamCreated: StreamEvent;
    streamDestroyed: StreamEvent;
    accessAllowed: never;
    accessDenied: never;
    accessDialogOpened: never;
    accessDialogClosed: never;
}