[![License badge](https://img.shields.io/badge/license-Apache2-orange.svg)](http://www.apache.org/licenses/LICENSE-2.0)
[![Documentation badge](https://readthedocs.org/projects/fiware-orion/badge/?version=latest)](http://doc-kurento.readthedocs.org/en/latest/)
[![Docker badge](https://img.shields.io/docker/pulls/fiware/orion.svg)](https://hub.docker.com/r/fiware/stream-oriented-kurento/)
[![Support badge]( https://img.shields.io/badge/support-sof-yellowgreen.svg)](http://stackoverflow.com/questions/tagged/kurento)

${project.name}
======================

The ${project.name} implements multimedia group communications with WebRTC using services from 
Kurento Room Server.

There are complete instructions on how to deploy the demo binary: 
http://doc-kurento-room.readthedocs.org/en/current/demo_deployment.html

Installation instructions
-------------------------

By running `sudo ./bin/install.sh`, the jar file containing the demo will be copied into 
_/var/lib/kurento_, and the startup script will be put in _/etc/init.d/${project.artifactId}_. Once 
the demo is installed, it can be managed as a regular service with

```
sudo service ${project.artifactId} {start|stop|restart}
```
If you want to change the port, you can do so by editing the file _/etc/kurento/${project.artifactId}.properties_.

Quick start instructions
------------------------

By running `./bin/start.sh` the jar file containing the demo will be started right away, from the
_files/_ folder.

Press `Control-C` to stop its execution.

If you want to change the port, you can do so by editing the file _files/${project.artifactId}.properties_.
