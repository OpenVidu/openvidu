[![License badge](https://img.shields.io/badge/license-Apache2-orange.svg)](http://www.apache.org/licenses/LICENSE-2.0)
[![Documentation Status](https://readthedocs.org/projects/openvidu/badge/?version=stable)](https://docs.openvidu.io/en/stable/?badge=stable)
[![Docker badge](https://img.shields.io/docker/pulls/openvidu/openvidu-server-kms.svg)](https://hub.docker.com/r/openvidu/openvidu-server-kms)
[![Support badge](https://img.shields.io/badge/support-sof-yellowgreen.svg)](https://openvidu.discourse.group/)

[![][OpenViduLogo]](http://openvidu.io)

webcomponent-e2e
===

[OpenViduLogo]: https://secure.gravatar.com/avatar/5daba1d43042f2e4e85849733c8e5702?s=120


### How to run it (localhost)

1) Start openvidu-server:

```
docker run -p 4443:4443 --rm -e OPENVIDU_SECRET=MY_SECRET openvidu/openvidu-server-kms:latest
```

2) _**Opnenning a new terminal**_, prepare webcomponent test.

Run the following command under the root directory (`openvidu/openvidu-webcomponent-angular/`)

```bash
npm run install
npm run webcomponent:prepare-test-e2e
```

3) Install test dependencies:

```nash
npm run install --prefix webcomponent-test-e2e
```

4) _**Opnenning a new terminal**_, Run the webcomponent app. By default, the app will start on `http://localhost:8080`.

```bash
http-server webcomponent-test-e2e/web
```

5) Run the E2E test:

```bash
npm run webcomponent:e2e
```
