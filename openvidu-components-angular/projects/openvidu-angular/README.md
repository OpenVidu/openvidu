# openvidu-angular

 [![License badge](https://img.shields.io/badge/license-Apache2-orange.svg)](http://www.apache.org/licenses/LICENSE-2.0)
[![Npm version](https://img.shields.io/npm/v/openvidu-angular?label=npm-version)](https://npmjs.org/package/openvidu-angular)
[![Npm downloads](https://img.shields.io/npm/dw/openvidu-angular?label=npm2-downloads)](https://npmjs.org/package/openvidu-angular)

**The easier way to build powerful OpenVidu videoconference frontend applications.**

## How to install

```
npm install openvidu-angular@latest
```

## How to use it

In your `app.module.ts`:

```typescript
import { OpenViduAngularConfig, OpenViduAngularModule } from 'openvidu-angular';

const config: OpenViduAngularConfig = {
    production: environment.production
};

@NgModule({
    imports: [
        ...
        OpenViduAngularModule.forRoot(config)
    ]
})
```