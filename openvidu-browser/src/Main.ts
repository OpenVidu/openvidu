import { OpenVidu } from './OpenVidu/OpenVidu';
import { JL } from 'jsnlog';

if (window) {
    window['OpenVidu'] = OpenVidu;
}

// Disable jsnlog window error overriding
JL.setOptions({ enabled: false })