# openvidu-angular

openvidu-angular is a library generated with the aim of facilitate the customization of videconference app provides by OpenVidu, providing powerful ready-to-use components.

This library is an Angular library based on Angular projections

## Code scaffolding

## Architechture

```
openvidu-components-angular
│
└─── src (openvidu-components-testapp)
│
└───projects
    │
	└─── openvidu-angular
```

## Development server

Run `ng serve` for a dev server.

Run, in a new terminal, `npm run lib:serve` for serving the openvidu-angular library with live reload

## Code scaffolding

For generate new components in openvidu-angular:

```bash
ng g component components/component-name --project=openvidu-angular
```


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
    OpenviduAngularModule.forRoot({
      environment: environment
    }),
    ...
 ]})
```
