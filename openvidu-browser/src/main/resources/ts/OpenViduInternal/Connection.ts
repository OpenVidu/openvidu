import { Stream, StreamOptions } from './Stream';
import { OpenViduInternal } from './OpenViduInternal';
import { SessionInternal } from './SessionInternal';

type ObjMap<T> = { [s: string]: T; }

export interface ConnectionOptions {
    id: string;
    metadata: string;
    streams?: StreamOptions[];
}

export class Connection {

    public connectionId: string;
    public data: string;
    public creationTime: number;
    private streams: ObjMap<Stream> = {};
    private streamsOpts: StreamOptions[] = [];

    constructor( private openVidu: OpenViduInternal, private local: boolean, private room: SessionInternal, private options?: ConnectionOptions ) {

        if ( options ) {

            this.connectionId = options.id;
            this.data = options.metadata;

            if ( options.streams ) {

                for ( let streamOptions of options.streams ) {

                    let streamOpts = {
                        id: streamOptions.id,
                        participant: this,
                        recvVideo: ( streamOptions.recvVideo == undefined ? true : streamOptions.recvVideo ),
                        recvAudio: ( streamOptions.recvAudio == undefined ? true : streamOptions.recvAudio ),
                        audio: streamOptions.audio,
                        video: streamOptions.video,
                        data: streamOptions.data,
                        mediaConstraints: streamOptions.mediaConstraints
                    }
                    let stream = new Stream( openVidu, false, room, streamOpts );

                    this.addStream( stream );
                    this.streamsOpts.push( streamOpts );
                }
            }
        }
        
        console.log( "New " + ( local ? "local " : "remote " ) + "participant " + this.connectionId
            + ", streams opts: ", this.streamsOpts );
    }

    setId( newId ) {
        this.connectionId = newId;
    }

    addStream( stream: Stream ) {
        this.streams[stream.getIdInParticipant()] = stream;
        this.room.getStreams()[stream.getIdInParticipant()] = stream;
    }

    getStreams() {
        return this.streams;
    }

    dispose() {
        for ( let key in this.streams ) {
            this.streams[key].dispose();
        }
    }

    getId() {
        return this.connectionId;
    }

    sendIceCandidate( candidate ) {

        console.debug(( this.local ? "Local" : "Remote" ), "candidate for",
            this.getId(), JSON.stringify( candidate ) );

        this.openVidu.sendRequest( "onIceCandidate", {
            endpointName: this.getId(),
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
}