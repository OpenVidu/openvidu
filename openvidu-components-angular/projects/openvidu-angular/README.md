# openvidu-angular

The easier way to build powerful OpenVidu videoconference frontend applications.

## How to install

```
npm install openvidu-angular@latest
```

## Usage

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

## How to use in an Angular project

Importing library module in yout `app.module.ts`

```typescript
@NgModule({
  imports: [
    BrowserModule,
    OpenviduAngularModule.forRoot({
      environment: environment
    }),
    ...
 ]})
```
