---
name: Bug report
about: Create a report to help us improve
title: ''
labels: bug
assignees: ''

---

<!--
IMPORTANT!!! IMPORTANT!!! IMPORTANT!!! IMPORTANT!!!
YOU SHOULD NEVER DELETE THE CONTENT OF THIS TEMPLATE WHEN OPENING AN ISSUE. IF YOUR QUESTION DOES NOT FIT THE TEMPLATE THEN IT MOST PROBABLY BELONGS TO OPENVIDU FORUM (https://openvidu.discourse.group/)

Hi! First of all, welcome to OpenVidu issue tracker. Please, carefully read the two points below before opening a new issue:

1. Is your question really a bug? In other words: did you actually get an unexpected behavior from OpenVidu platform? If you are not sure about the answer or you just want support for a particular use case, you can post a new question in our official Discourse Forum (https://openvidu.discourse.group/). OpenVidu community or a team's member will reply ASAP.

2. If your question is undoubtedly a bug, check that there's no other issue (opened or closed) talking about it. Your question may have already been answered! If you cannot find anything useful, please fill the report below.
-->

**Describe the bug**
A few words describing what the bug is.

**Expected behavior**
A clear and concise description of what you expected to happen.

**Wrong current behavior**
A clear and concise description of what is actually happening instead of the expected behavior.

**OpenVidu tutorial where to replicate the error**
This is an EXTREMELY IMPORTANT STEP. If we are able to replicate the error in any of the official [OpenVidu Tutorials](https://github.com/OpenVidu/openvidu-tutorials) or [OpenVidu Demos](https://github.com/OpenVidu), then we will be able to quickly fix it. If you are getting the error in your own application, please try to add the necessary changes to the most similar tutorial so it fails with the same error (try to keep those changes as contained as possible, so that the original tutorial maintains its integrity). Once you have an application to replicate the error, explain in detail the steps to get it like this:
1. Clone repository [...]
2. Compile the application like this [...]
3. Run OpenVidu Server like this [...]
4. Run the application like this [...]
5. Join 1 user... Publish a video stream [...]
6. See error

**OpenVidu deployment info**
How is your OpenVidu Server instance deployed when you get the bug. A couple of possible examples are listed below:
- Docker container as explained in OpenVidu tutorials, run with command `docker run ...` on macOS Catalina 10.15.1
- AWS deployment as explained in OpenVidu Docs (https://docs.openvidu.io/en/stable/deployment/deploying-aws/)

> **IMPORTANT NOTE**: please, if you think the bug might be related to OpenVidu Server side, specify here if you are also getting the error by using OpenVidu Server Demos instance. This instance is publicly available (use it only for this test, because it is not secure!!!): **URL**: `https://demos.openvidu.io:4443`, **SECRET**: `MY_SECRET`

**Client device info (if applicable)**
Describe the client device(s) or platform(s) where you are able to replicate the error. For example:
- Chrome 78.0.3904.97 (Official Build) (64-bit) on Windows 10 (1903).
- Firefox Mobile 68.2.0 running on OnePlus 6 with Android 9.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Additional context**
Add any other context about the problem here. For example, attach any useful logs related to the issue.
