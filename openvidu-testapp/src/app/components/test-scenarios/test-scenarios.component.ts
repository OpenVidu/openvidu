import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';

import { SessionConf } from '../openvidu-instance/openvidu-instance.component';
import { OpenviduParamsService } from '../../services/openvidu-params.service';
import { TestFeedService } from '../../services/test-feed.service';
import { ScenarioPropertiesDialogComponent } from '../dialogs/scenario-properties-dialog/scenario-properties-dialog.component';
import { StreamManagerWrapper } from '../users-table/table-video.component';

import {
  OpenVidu,
  Session,
  StreamEvent,
  StreamManagerEvent,
  PublisherProperties,
  ConnectionEvent
} from 'openvidu-browser';
import {
  OpenVidu as OpenViduAPI,
  SessionProperties as SessionPropertiesAPI,
  MediaMode,
  RecordingMode,
  RecordingLayout
} from 'openvidu-node-client';

@Component({
  selector: 'app-test-scenarios',
  templateUrl: './test-scenarios.component.html',
  styleUrls: ['./test-scenarios.component.css']
})
export class TestScenariosComponent implements OnInit, OnDestroy {

  fixedSessionId = 'SCENARIO_TEST';

  openviduUrl: string;
  openviduSecret: string;

  scenarioPlaying = false;

  paramsSubscription: Subscription;
  eventsInfoSubscription: Subscription;

  // OpenViduInstance collection
  users: SessionConf[] = [];
  connections: string[] = [];
  publishers: StreamManagerWrapper[] = [];
  subscribers: { connectionId: string, subs: StreamManagerWrapper[] }[] = [];
  totalNumberOfStreams = 0;
  manyToMany = 2;
  oneToMany = 2;

  // OpenVidu Browser objects
  OVs: OpenVidu[] = [];
  sessions: Session[] = [];

  // OpenVidu Node Client objects
  OV_NodeClient: OpenViduAPI;
  sessionProperties: SessionPropertiesAPI = {
    mediaMode: MediaMode.ROUTED,
    recordingMode: RecordingMode.MANUAL,
    defaultRecordingLayout: RecordingLayout.BEST_FIT,
    defaultCustomLayout: '',
    customSessionId: ''
  };

  turnConf = 'auto';
  manualTurnConf: RTCIceServer = { urls: [] };

  publisherProperties: PublisherProperties = {
    audioSource: false,
    videoSource: undefined,
    frameRate: 2,
    resolution: '320x240',
    mirror: true,
    publishAudio: true,
    publishVideo: true
  };

  report;
  numberOfReports = 0;
  stringifyAllReports = '';
  textAreaValue = '';
  isFocusedOnReport = false;

  constructor(
    private openviduParamsService: OpenviduParamsService,
    private testFeedService: TestFeedService,
    private dialog: MatDialog,
    private http: HttpClient
  ) { }

  ngOnInit() {
    const openviduParams = this.openviduParamsService.getParams();
    this.openviduUrl = openviduParams.openviduUrl;
    this.openviduSecret = openviduParams.openviduSecret;

    this.paramsSubscription = this.openviduParamsService.newParams$.subscribe(
      params => {
        this.openviduUrl = params.openviduUrl;
        this.openviduSecret = params.openviduSecret;
      });

    this.eventsInfoSubscription = this.testFeedService.newLastEvent$.subscribe(
      newEvent => {
        (window as any).myEvents += ('<br>' + JSON.stringify(newEvent));
      });
  }

  ngOnDestroy() {
    this.endScenario();
    this.paramsSubscription.unsubscribe();
    this.eventsInfoSubscription.unsubscribe();
  }

  loadScenario(subsPubs: number, pubs: number, subs: number): void {

    this.totalNumberOfStreams = pubs + subsPubs; // Number of outgoing streams
    this.totalNumberOfStreams += pubs * (subs + subsPubs); // Publishers only times total number of subscribers
    if (subsPubs > 0) {
      // Publihsers/Subscribers times total number of subscribers (minus 1 for not being subscribed to their own publisher)
      this.totalNumberOfStreams += subsPubs * (subs + (subsPubs - 1));
    }

    this.users = [];
    this.report = { 'streamsOut': { 'numberOfElements': 0, 'content': [] }, 'streamsIn': { 'numberOfElements': 0, 'content': [] } };
    this.loadSubsPubs(subsPubs);
    this.loadPubs(pubs);
    this.loadSubs(subs);
    this.startSession();
    this.scenarioPlaying = true;
  }

  endScenario() {
    for (const session of this.sessions) {
      session.disconnect();
    }
    this.publishers = [];
    this.subscribers = [];
    this.OVs = [];
    this.sessions = [];
    this.connections = [];
    this.scenarioPlaying = false;
    delete this.report;
    this.numberOfReports = 0;
    this.textAreaValue = '';
    this.stringifyAllReports = '';
  }

  private loadSubsPubs(n: number): void {
    for (let i = 0; i < n; i++) {
      this.users.push({
        subscribeTo: true,
        publishTo: true,
        startSession: true
      });
    }
  }

  private loadSubs(n: number): void {
    for (let i = 0; i < n; i++) {
      this.users.push({
        subscribeTo: true,
        publishTo: false,
        startSession: true
      });
    }
  }

  private loadPubs(n: number): void {
    for (let i = 0; i < n; i++) {
      this.users.push({
        subscribeTo: false,
        publishTo: true,
        startSession: true
      });
    }
  }

  private startSession() {
    for (const user of this.users) {
      this.getToken().then(token => {

        const startTimeForUser = Date.now();

        const OV = new OpenVidu();

        if (this.turnConf === 'freeice') {
          OV.setAdvancedConfiguration({ iceServers: 'freeice' });
        } else if (this.turnConf === 'manual') {
          OV.setAdvancedConfiguration({ iceServers: [this.manualTurnConf] });
        }
        const session = OV.initSession();

        this.OVs.push(OV);
        this.sessions.push(session);

        session.on('connectionCreated', (event: ConnectionEvent) => {
          if (this.connections.indexOf(event.connection.connectionId) === -1) {
            this.connections.push(event.connection.connectionId);
          }
        });

        if (user.subscribeTo) {
          session.on('streamCreated', (event: StreamEvent) => {
            const subscriber = session.subscribe(event.stream, undefined, (error) => {
              const subAux = this.subscribers
                .find(s => s.connectionId === session.connection.connectionId).subs
                .find(s => s.streamManager.stream.connection.connectionId === subscriber.stream.connection.connectionId);
              if (!!error) {
                subAux.state['errorConnecting'] = (Date.now() - startTimeForUser);
              } else {
                subAux.state['connected'] = (Date.now() - startTimeForUser);
              }
            });

            const sub = this.subscribers.find(s => s.connectionId === session.connection.connectionId);
            if (!sub) {
              this.subscribers.push({
                connectionId: session.connection.connectionId,
                subs: [{
                  startTime: startTimeForUser,
                  connectionId: session.connection.connectionId,
                  streamManager: subscriber,
                  state: { 'connecting': (Date.now() - startTimeForUser) }
                }]
              });
            } else {
              sub.subs.push({
                startTime: startTimeForUser,
                connectionId: session.connection.connectionId,
                streamManager: subscriber,
                state: { 'connecting': (Date.now() - startTimeForUser) }
              });
            }

            subscriber.on('streamPlaying', (e: StreamManagerEvent) => {
              this.subscribers
                .find(s => s.connectionId === session.connection.connectionId).subs
                .find(s => s.streamManager.stream.connection.connectionId === subscriber.stream.connection.connectionId)
                .state['playing'] = (Date.now() - startTimeForUser);
            });
          });
        }

        session.connect(token)
          .then(() => {
            if (user.publishTo) {

              const publisher = OV.initPublisher(undefined, this.publisherProperties);
              const publisherWrapper = {
                startTime: startTimeForUser,
                connectionId: session.connection.connectionId,
                streamManager: publisher,
                state: { 'connecting': (Date.now() - startTimeForUser) }
              };

              publisher.on('streamCreated', () => {
                publisherWrapper.state['connected'] = (Date.now() - startTimeForUser);
              });
              publisher.on('streamPlaying', () => {
                publisherWrapper.state['playing'] = (Date.now() - startTimeForUser);
              });
              session.publish(publisher).catch(() => {
                publisherWrapper.state['errorConnecting'] = (Date.now() - startTimeForUser);
              });
              this.publishers.push(publisherWrapper);

            }
          })
          .catch();
      });
    }
  }

  private getToken(): Promise<string> {
    this.OV_NodeClient = new OpenViduAPI(this.openviduUrl, this.openviduSecret);
    if (!this.sessionProperties.customSessionId) {
      this.sessionProperties.customSessionId = this.fixedSessionId;
    }
    return this.OV_NodeClient.createSession(this.sessionProperties)
      .then(session_NodeClient => {
        return session_NodeClient.generateToken();
      });
  }

  openScenarioPropertiesDialog() {
    const dialogRef = this.dialog.open(ScenarioPropertiesDialogComponent, {
      data: {
        publisherProperties: this.publisherProperties,
        turnConf: this.turnConf,
        manualTurnConf: this.manualTurnConf
      },
      width: '300px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!!result) {
        this.publisherProperties = result.publisherProperties;
        this.turnConf = result.turnConf;
        this.manualTurnConf = result.manualTurnConf;
      }
    });
  }

  addReportForStream(event: StreamManagerWrapper) {
    event.streamManager.stream.getSelectedIceCandidate()
      .then(localCandidatePair => {

        let newReport;

        if (event.streamManager.remote) {
          newReport = {
            connectionId: event.connectionId,
            startTime: event.startTime,
            streamId: event.streamManager.stream.streamId,
            state: event.state,
            candidatePairSelectedByBrowser: {
              localCandidate: localCandidatePair.localCandidate,
              remoteCandidate: localCandidatePair.remoteCandidate
            },
            candidatePairSelectedByKms: {
              localCandidate: {},
              remoteCandidate: {}
            },
            iceCandidatesSentByBrowser:
              event.streamManager.stream.getLocalIceCandidateList().map((c: RTCIceCandidate) => c.candidate),
            iceCandidatesReceivedByBrowser:
              event.streamManager.stream.getRemoteIceCandidateList().map((c: RTCIceCandidate) => c.candidate),
          };

          this.report.streamsIn.numberOfElements++;
          this.report.streamsIn.content.push(newReport);
        } else {
          newReport = {
            connectionId: event.connectionId,
            startTime: event.startTime,
            streamId: event.streamManager.stream.streamId,
            state: event.state,
            candidatePairSelectedByBrowser: {
              localCandidate: localCandidatePair.localCandidate,
              remoteCandidate: localCandidatePair.remoteCandidate
            },
            candidatePairSelectedByKms: {
              localCandidate: {},
              remoteCandidate: {}
            },
            iceCandidatesSentByBrowser:
              event.streamManager.stream.getLocalIceCandidateList().map((c: RTCIceCandidate) => c.candidate),
            iceCandidatesReceivedByBrowser:
              event.streamManager.stream.getRemoteIceCandidateList().map((c: RTCIceCandidate) => c.candidate)
          };

          this.report.streamsOut.numberOfElements++;
          this.report.streamsOut.content.push(newReport);
        }

        if (++this.numberOfReports === this.totalNumberOfStreams) {
          this.updateRemoteStreamsInfo();
        }

      })
      .catch();
  }

  private updateRemoteStreamsInfo() {
    let headers = new HttpHeaders();
    headers = headers.append('Authorization', 'Basic ' + btoa('OPENVIDUAPP:' + this.openviduSecret));
    this.http.get(this.openviduUrl + 'api/sessions/' + this.fixedSessionId + '?webRtcStats=true', { headers }).subscribe(
      sessionInfo => {

        this.report.streamsOut.content.forEach(report => {
          const streamOutRemoteInfo = sessionInfo['connections'].content
            .find(c => c.connectionId === report.connectionId).publishers
            .find(p => {
              report.webrtcEndpointName = p.webrtcEndpointName;
              report.localSdp = p.localSdp;
              report.remoteSdp = p.remoteSdp;
              return p.webrtcEndpointName === report.streamId;
            });
          report.candidatePairSelectedByKms = {
            localCandidate: this.parseRemoteCandidatePair(streamOutRemoteInfo.localCandidate),
            remoteCandidate: this.parseRemoteCandidatePair(streamOutRemoteInfo.remoteCandidate)
          };
          report.serverEvents = streamOutRemoteInfo.events;
          for (const ev of report.serverEvents) {
            ev.timestamp = Number(ev.timestamp) - report.startTime;
          }
        });

        this.report.streamsIn.content.forEach(report => {
          const streamInRemoteInfo = sessionInfo['connections'].content
            .find(c => c.connectionId === report.connectionId).subscribers
            .find(p => {
              report.webrtcEndpointName = p.webrtcEndpointName;
              report.localSdp = p.localSdp;
              report.remoteSdp = p.remoteSdp;
              return p.webrtcEndpointName === report.connectionId + '_' + report.streamId;
            });
          report.candidatePairSelectedByKms = {
            localCandidate: this.parseRemoteCandidatePair(streamInRemoteInfo.localCandidate),
            remoteCandidate: this.parseRemoteCandidatePair(streamInRemoteInfo.remoteCandidate)
          };
          report.serverEvents = streamInRemoteInfo.events;
          for (const ev of report.serverEvents) {
           ev.timestamp = Number(ev.timestamp) - report.startTime;
          }
        });

        this.stringifyAllReports = JSON.stringify(this.report, null, '\t');
        console.log('Info has changed: ' + !(this.stringifyAllReports === this.textAreaValue));
        this.textAreaValue = this.stringifyAllReports;
      },
      error => { }
    );
  }

  private parseRemoteCandidatePair(candidateStr: string) {
    if (!candidateStr) {
      return 'ERROR: No remote candidate available';
    }
    const array = candidateStr.split(/\s+/);
    return {
      portNumber: array[5],
      ipAddress: array[4],
      transport: array[2].toLowerCase(),
      candidateType: array[7],
      priority: array[3],
      raw: candidateStr
    };
  }

  focusOnReportForStream(event) {
    this.isFocusedOnReport = true;
    let jsonObject = !!event.in ? this.report.streamsIn : this.report.streamsOut;
    jsonObject = jsonObject.content.find(stream => {
      const webrtcEndpointName = !!event.in ? event.connectionId + '_' + event.streamId : event.streamId;
      return (stream.connectionId === event.connectionId && stream.webrtcEndpointName === webrtcEndpointName);
    });
    this.textAreaValue = JSON.stringify(jsonObject, null, '\t');
  }

  /*addReportForStreamConcurrent(event: StreamManagerWrapper) {
    let headers = new HttpHeaders();
    headers = headers.append('Authorization', 'Basic ' + btoa('OPENVIDUAPP:' + this.openviduSecret));
    this.http.get(this.openviduUrl + 'api/sessions/' + this.fixedSessionId + '?webRtcStats=true', { headers }).subscribe(
      sessionInfo => {

        event.streamManager.stream.getSelectedIceCandidate()
          .then(localCandidatePair => {
            let newReport;
            if (event.streamManager.remote) {
              const streamInRemoteInfo = sessionInfo['connections'].content
                .find(c => c.connectionId === event.connectionId).subscribers
                .find(p => p.webrtcEndpointName === event.connectionId + '_' + event.streamManager.stream.streamId);

              newReport = {
                connectionId: event.connectionId,
                streamId: event.streamManager.stream.streamId,
                state: event.state,
                localCandidatePair: {
                  localCandidate: localCandidatePair.localCandidate,
                  remoteCandidate: localCandidatePair.remoteCandidate
                },
                remoteCandidatePair: {
                  localCandidate: streamInRemoteInfo.localCandidate,
                  remoteCandidate: streamInRemoteInfo.remoteCandidate
                }
              };

              this.report.streamsIn.numberOfElements++;
              this.report.streamsIn.content.push(newReport);
              this.stringifyReport = JSON.stringify(this.report, null, '\t');
            } else {
              const streamOutRemoteInfo = sessionInfo['connections'].content
                .find(c => c.connectionId === event.connectionId).publishers
                .find(p => p.webrtcEndpointName === event.streamManager.stream.streamId);

              newReport = {
                connectionId: event.connectionId,
                streamId: event.streamManager.stream.streamId,
                state: event.state,
                localCandidatePair: {
                  localCandidate: localCandidatePair.localCandidate,
                  remoteCandidate: localCandidatePair.remoteCandidate
                },
                remoteCandidatePair: {
                  localCandidate: streamOutRemoteInfo.localCandidate,
                  remoteCandidate: streamOutRemoteInfo.remoteCandidate
                }
              };

              this.report.streamsOut.numberOfElements++;
              this.report.streamsOut.content.push(newReport);
              this.stringifyReport = JSON.stringify(this.report, null, '\t');
            }
          })
          .catch();
      },
      error => { }
    );
  }*/

}
