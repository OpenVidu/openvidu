# openvidu-components-angular

openvidu-components-angular is a library generated with the aim of facilitate the customization of videconference app provides by OpenVidu, providing powerful ready-to-use components.

This library is an Angular library based on Angular projections

## Code scaffolding

## Build

```bash
npm run lib:build
```

## Publishing

After the library is built, tun the following command:

```bash
cd dist/ && npm publish
```

## How to use in an Angular project

Importing library module in yout `app.module.ts`

```typescript
@NgModule({
  imports: [
    BrowserModule,
    OpenviduComponentsAngularModule.forRoot({
      environment: environment
    }),
    ...
 ]})
```
