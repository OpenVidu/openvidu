// Participant --------------------------------
import { Stream, StreamOptions } from './Stream';
import { OpenVidu } from './OpenVidu';
import { Room } from './Room';

type ObjMap<T> = { [s: string]: T; }

export interface ParticipantOptions {
    id: string;
    streams?: StreamOptions[];
}

export class Participant {

    private id: string;
    private streams: ObjMap<Stream> = {};
    private streamsOpts: StreamOptions[] = [];

    constructor( private openVidu: OpenVidu, private local: boolean, private room: Room, private options: ParticipantOptions ) {

        this.id = options.id;

        if ( options.streams ) {

            for ( let streamOptions of options.streams ) {

                let streamOpts = {
                    id: streamOptions.id,
                    participant: this,
                    recvVideo: ( streamOptions.recvVideo == undefined ? true : streamOptions.recvVideo ),
                    recvAudio: ( streamOptions.recvAudio == undefined ? true : streamOptions.recvAudio ),
                    audio: streamOptions.audio,
                    video: streamOptions.video,
                    data: streamOptions.data
                }
                let stream = new Stream( openVidu, false, room, streamOpts );

                this.addStream( stream );
                this.streamsOpts.push( streamOpts );
            }
        }

        console.log( "New " + ( local ? "local " : "remote " ) + "participant " + this.id
            + ", streams opts: ", this.streamsOpts );


    }

    setId( newId ) {
        this.id = newId;
    }

    addStream( stream ) {
        this.streams[stream.getID()] = stream;
        this.room.getStreams()[stream.getID()] = stream;
    }

    getStreams() {
        return this.streams;
    }

    dispose() {
        for ( let key in this.streams ) {
            this.streams[key].dispose();
        }
    }

    getID() {
        return this.id;
    }

    sendIceCandidate( candidate ) {

        console.debug(( this.local ? "Local" : "Remote" ), "candidate for",
            this.getID(), JSON.stringify( candidate ) );
        
        this.openVidu.sendRequest( "onIceCandidate", {
            endpointName: this.getID(),
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