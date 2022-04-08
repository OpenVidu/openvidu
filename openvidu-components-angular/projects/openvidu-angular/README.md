# openvidu-angular

The easier way to build powerful OpenVidu videoconference frontend applications.

## How to install

```
npm install openvidu-angular@latest
```

## Ho to use it

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
