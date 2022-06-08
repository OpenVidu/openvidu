# openvidu-angular

[![License badge](https://img.shields.io/badge/license-Apache2-orange.svg)](http://www.apache.org/licenses/LICENSE-2.0)
[![OpenVidu Tests](https://github.com/OpenVidu/openvidu/actions/workflows/openvidu-ce-test.yml/badge.svg)](https://github.com/OpenVidu/openvidu/actions/workflows/openvidu-ce-test.yml)
[![Npm version](https://img.shields.io/npm/v/openvidu-angular?label=npm-version)](https://npmjs.org/package/openvidu-angular)
[![Npm downloads](https://img.shields.io/npm/dw/openvidu-angular?label=npm2-downloads)](https://npmjs.org/package/openvidu-angular)

**The easier way to build powerful OpenVidu videoconference frontend applications.**

## Requirements:

You will need NPM and Angular CLI to serve the Angular app. Check your installation with the following command:

```bash
npm -v
ng v
```

## How to install it

1. You need to install the openvidu-angular library in your Angular application:

```
npm install openvidu-angular
```

2. Also you need Angular Material:

```
ng add @angular/material
```

## Configure it


You need to import the openvidu-angular module in your `app.module.ts`:

```typescript
import { OpenViduAngularConfig, OpenViduAngularModule } from 'openvidu-angular';
import { environment } from 'src/environments/environment';

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

You can also add the default styles in your `styles.scss` file:

```css
:root {
  --ov-primary-color: #303030;
  --ov-secondary-color: #3e3f3f;
  --ov-tertiary-color: #598eff;
  --ov-warn-color: #EB5144;
  --ov-accent-color: #ffae35;
  --ov-light-color: #e6e6e6;

  --ov-logo-background-color: #3a3d3d;

  --ov-text-color: #ffffff;

  --ov-panel-text-color: #1d1d1d;
  --ov-panel-background: #ffffff;

  --ov-buttons-radius: 50%;
  --ov-leave-button-radius: 10px;
  --ov-video-radius: 5px;
  --ov-panel-radius: 5px;
}
```