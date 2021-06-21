import { OpenVidu } from './OpenVidu/OpenVidu';
import { JL } from 'jsnlog';

if (window) {
    window['OpenVidu'] = OpenVidu;
}

// Disable jsnlog when library is loaded
JL.setOptions({ enabled: false })
