/*
 * (C) Copyright 2016 OpenVidu (http://kurento.org/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { Room } from './Room';
import { Stream } from './Stream';

declare var RpcBuilder: any;

type Callback<T> = ( error?: any, openVidu?: T ) => void;

export class OpenVidu {

    private room: Room;
    private userName: string;
    private jsonRpcClient: any;
    private rpcParams: any;
    private callback: Callback<OpenVidu>;

    constructor( private wsUri: string ) { }

    getRoom() {
        return this.room;
    }

    connect( callback: Callback<OpenVidu> ): void {

        this.callback = callback;

        this.initJsonRpcClient( this.wsUri );
    }

    private initJsonRpcClient( wsUri: string ): void {

        let config = {
            heartbeat: 3000,
            sendCloseMessage: false,
            ws: {
                uri: wsUri,
                useSockJS: false,
                onconnected: this.connectCallback.bind( this ),
                ondisconnect: this.disconnectCallback.bind( this ),
                onreconnecting: this.reconnectingCallback.bind( this ),
                onreconnected: this.reconnectedCallback.bind( this )
            },
            rpc: {
                requestTimeout: 15000,
                //notifications
                participantJoined: this.onParticipantJoined.bind( this ),
                participantPublished: this.onParticipantPublished.bind( this ),
                participantUnpublished: this.onParticipantLeft.bind( this ),
                participantLeft: this.onParticipantLeft.bind( this ),
                participantEvicted: this.onParticipantEvicted.bind( this ),
                sendMessage: this.onNewMessage.bind( this ),
                iceCandidate: this.iceCandidateEvent.bind( this ),
                mediaError: this.onMediaError.bind( this ),
                custonNotification: this.customNotification.bind( this )
            }
        };

        this.jsonRpcClient = new RpcBuilder.clients.JsonRpcClient( config );
    }


    private customNotification( params ) {
        if ( this.isRoomAvailable() ) {
            this.room.emitEvent( "custom-message-received", [{ params: params }] );
        }
    }

    private connectCallback( error ) {
        if ( error ) {
            this.callback( error );
        } else {
            this.callback( null, this );
        }
    }

    private isRoomAvailable() {
        if ( this.room !== undefined && this.room instanceof Room ) {
            return true;
        } else {
            console.warn( 'Room instance not found' );
            return false;
        }
    }

    private disconnectCallback() {
        console.log( 'Websocket connection lost' );
        if ( this.isRoomAvailable() ) {
            this.room.onLostConnection();
        } else {
            alert( 'Connection error. Please reload page.' );
        }
    }

    private reconnectingCallback() {
        console.log( 'Websocket connection lost (reconnecting)' );
        if ( this.isRoomAvailable() ) {
            this.room.onLostConnection();
        } else {
            alert( 'Connection error. Please reload page.' );
        }
    }

    private reconnectedCallback() {
        console.log( 'Websocket reconnected' );
    }

    private onParticipantJoined( params ) {
        if ( this.isRoomAvailable() ) {
            this.room.onParticipantJoined( params );
        }
    }

    private onParticipantPublished( params ) {
        if ( this.isRoomAvailable() ) {
            this.room.onParticipantPublished( params );
        }
    }

    private onParticipantLeft( params ) {
        if ( this.isRoomAvailable() ) {
            this.room.onParticipantLeft( params );
        }
    }

    private onParticipantEvicted( params ) {
        if ( this.isRoomAvailable() ) {
            this.room.onParticipantEvicted( params );
        }
    }

    private onNewMessage( params ) {
        if ( this.isRoomAvailable() ) {
            this.room.onNewMessage( params );
        }
    }

    private iceCandidateEvent( params ) {
        if ( this.isRoomAvailable() ) {
            this.room.recvIceCandidate( params );
        }
    }

    private onRoomClosed( params ) {
        if ( this.isRoomAvailable() ) {
            this.room.onRoomClosed( params );
        }
    }

    private onMediaError( params ) {
        if ( this.isRoomAvailable() ) {
            this.room.onMediaError( params );
        }
    }


    setRpcParams( params: any ) {
        this.rpcParams = params;
    }

    sendRequest( method, params, callback?) {

        if ( params && params instanceof Function ) {
            callback = params;
            params = undefined;
        }

        params = params || {};

        if ( this.rpcParams && this.rpcParams !== null && this.rpcParams !== undefined ) {
            for ( let index in this.rpcParams ) {
                if ( this.rpcParams.hasOwnProperty( index ) ) {
                    params[index] = this.rpcParams[index];
                    console.log( 'RPC param added to request {' + index + ': ' + this.rpcParams[index] + '}' );
                }
            }
        }

        console.log( 'Sending request: { method:"' + method + '", params: ' + JSON.stringify( params ) + ' }' );

        this.jsonRpcClient.send( method, params, callback );
    }

    close( forced ) {
        if ( this.isRoomAvailable() ) {
            this.room.leave( forced, this.jsonRpcClient );
        }
    };

    disconnectParticipant( stream ) {
        if ( this.isRoomAvailable() ) {
            this.room.disconnect( stream );
        }
    }

    Stream( room, options ) {

        options = options || {
            audio: true,
            video: true,
            data: true
        }

        options.participant = room.getLocalParticipant();
        return new Stream( this, true, room, options );
    };

    Room( options ) {
        let room = new Room( this, options );
        return room;
    };

    //CHAT
    sendMessage( room, user, message ) {
        this.sendRequest( 'sendMessage', {
            message: message,
            userMessage: user,
            roomMessage: room
        }, function( error, response ) {
            if ( error ) {
                console.error( error );
            }
        });
    };

    sendCustomRequest( params, callback ) {
        this.sendRequest( 'customRequest', params, callback );
    };



}
