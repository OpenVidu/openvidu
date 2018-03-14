import { Stream, StreamOptionsServer, InboundStreamOptions } from './Stream';
import { OpenViduInternal } from './OpenViduInternal';
import { SessionInternal } from './SessionInternal';

type ObjMap<T> = { [s: string]: T; }

export interface ConnectionOptions {
    id: string;
    metadata: string;
    streams: StreamOptionsServer[];
}

export class Connection {

    public connectionId: string;
    public data: string;
    public creationTime: number;
    private streams: ObjMap<Stream> = {};
    private inboundStreamsOpts: InboundStreamOptions;

    constructor( private openVidu: OpenViduInternal, private local: boolean, private room: SessionInternal, private options?: ConnectionOptions ) {

        console.info( "'Connection' created (" + ( local ? "local" : "remote" ) + ")" + ( local ? "" : ", with 'connectionId' [" + (options ? options.id : '') + "] " ));

        if ( options && !local ) {

            this.connectionId = options.id;
            if (options.metadata) {
                this.data = options.metadata;
            }
            if (options.streams) {
                this.initRemoteStreams(options);
            }
        }
        
    }

    addStream( stream: Stream ) {
        stream.connection = this;
        this.streams[stream.streamId] = stream;
        //this.room.getStreams()[stream.streamId] = stream;
    }

    removeStream( key: string ) {
        delete this.streams[key];
        //delete this.room.getStreams()[key];
        delete this.inboundStreamsOpts;
    }

    setOptions(options: ConnectionOptions) {
        this.options = options;
    }

    getStreams() {
        return this.streams;
    }

    dispose() {
        for ( let key in this.streams ) {
            this.streams[key].dispose();
        }
    }

    sendIceCandidate( candidate ) {

        console.debug(( this.local ? "Local" : "Remote" ), "candidate for",
            this.connectionId, JSON.stringify( candidate ) );

        this.openVidu.sendRequest( "onIceCandidate", {
            endpointName: this.connectionId,
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex
        }, function( error, response ) {
            if ( error ) {
                console.error( "Error sending ICE candidate: "
                    + JSON.stringify( error ) );
            }
        });
    }

    initRemoteStreams(options: ConnectionOptions) {
        let opts: StreamOptionsServer;
        for ( opts of options.streams ) {
            
            let streamOptions: InboundStreamOptions = {
                id: opts.id,
                connection: this,
                recvAudio: ( opts.audioActive == null ? true : opts.audioActive ),
                recvVideo: ( opts.videoActive == null ? true : opts.videoActive ),
                typeOfVideo: opts.typeOfVideo,
            }
            let stream = new Stream(this.openVidu, false, this.room, streamOptions);

            this.addStream(stream);
            this.inboundStreamsOpts = streamOptions;
        }

        console.info("Remote 'Connection' with 'connectionId' [" + this.connectionId + "] is now configured for receiving Streams with options: ", this.inboundStreamsOpts );
    }
}