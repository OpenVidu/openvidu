# Openvidu Angular TestAPP


## Architechture

```
openvidu-components-angular
│
└─── src (openvidu-components-testapp)
│
└───projects
    │
	└─── openvidu-angular-v2compatibility
```

## How to develop with ease:

Run `ng serve` for a dev server.

Run, in a new terminal, `npm run lib:serve` for serving the openvidu-angular-v2compatibility library with live reload for listening changes

## Code scaffolding

For generate new components in openvidu-angular-v2compatibility:

```bash
ng g component components/component-name --project=openvidu-angular-v2compatibility
```


## Build library

```bash
npm run lib:build
```

## Publishing

After the library is built, tun the following command:

```bash
cd dist/ && npm publish
```
