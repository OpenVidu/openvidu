import { OpenVidu } from './OpenVidu/OpenVidu';
import { JL } from 'jsnlog';

if (typeof globalThis !== 'undefined') {
    globalThis['OpenVidu'] = OpenVidu;
}

// Disable jsnlog when library is loaded
JL.setOptions({ enabled: false });
