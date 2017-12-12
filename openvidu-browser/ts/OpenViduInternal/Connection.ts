import { Stream, StreamOptions } from './Stream';
import { OpenViduInternal } from './OpenViduInternal';
import { SessionInternal } from './SessionInternal';

type ObjMap<T> = { [s: string]: T; }

export interface ConnectionOptions {
    id: string;
    metadata: string;
    streams?: StreamOptions[];
    audioActive: boolean;
    videoActive: boolean;
}

export class Connection {

    public connectionId: string;
    public data: string;
    public creationTime: number;
    private streams: ObjMap<Stream> = {};
    private streamsOpts: StreamOptions[] = [];

    constructor( private openVidu: OpenViduInternal, private local: boolean, private room: SessionInternal, private options?: ConnectionOptions ) {

        console.info( "'Connection' created (" + ( local ? "local" : "remote" ) + ")" + ( local ? "" : ", with 'connectionId' [" + (options ? options.id : '') + "] " ));

        if ( options ) {

            this.connectionId = options.id;
            this.data = options.metadata;

            if ( options.streams ) {
                this.initStreams(options);
            }
        }
        
    }

    addStream( stream: Stream ) {
        this.streams[stream.streamId] = stream;
        this.room.getStreams()[stream.streamId] = stream;
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

    initStreams(options) {
        for ( let streamOptions of options.streams ) {
            
            let streamOpts = {
                id: streamOptions.id,
                connection: this,
                sendAudio: streamOptions.sendAudio,
                sendVideo: streamOptions.sendVideo,
                recvAudio: ( streamOptions.audioActive == undefined ? true : streamOptions.audioActive ),
                recvVideo: ( streamOptions.videoActive == undefined ? true : streamOptions.videoActive ),
                typeOfVideo: streamOptions.typeOfVideo,
                activeAudio: streamOptions.activeAudio,
                activeVideo: streamOptions.activeVideo,
                data: streamOptions.data,
                mediaConstraints: streamOptions.mediaConstraints
            }
            let stream = new Stream(this.openVidu, false, this.room, streamOpts );

            this.addStream( stream );
            this.streamsOpts.push( streamOpts );
        }

        console.info("Remote 'Connection' with 'connectionId' [" + this.connectionId + "] is now configured for receiving Streams with options: ", this.streamsOpts );
    }
}