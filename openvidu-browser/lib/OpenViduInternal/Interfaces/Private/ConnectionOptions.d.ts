import { StreamOptionsServer } from './StreamOptionsServer';
export interface ConnectionOptions {
    id: string;
    metadata: string;
    streams: StreamOptionsServer[];
}
