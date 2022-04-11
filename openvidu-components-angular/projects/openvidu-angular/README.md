# openvidu-angular

[![License badge](https://img.shields.io/badge/license-Apache2-orange.svg)](http://www.apache.org/licenses/LICENSE-2.0)
[![Npm version](https://img.shields.io/npm/v/openvidu-angular?label=npm-version)](https://npmjs.org/package/openvidu-angular)
[![Npm downloads](https://img.shields.io/npm/dw/openvidu-angular?label=npm2-downloads)](https://npmjs.org/package/openvidu-angular)

**The easier way to build powerful OpenVidu videoconference frontend applications.**

## Requirements:

You will need angular-cli (and of course NPM) to serve the Angular frontend. You can check it with the following command:

```bash
npm -v
ng v
```

## How to install

1. You need to install the openvidu-angular library in your Angular application:

```
npm install openvidu-angular
```

2. Also you need Angular Material:

```
ng add @angular/material
```

## How to use it


You need import the openvidu-angular module in your `app.module.ts`:

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