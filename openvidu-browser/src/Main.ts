import { OpenVidu } from './OpenVidu/OpenVidu';

if (window) {
    // tslint:disable-next-line:no-string-literal
    window['OpenVidu'] = OpenVidu;
}