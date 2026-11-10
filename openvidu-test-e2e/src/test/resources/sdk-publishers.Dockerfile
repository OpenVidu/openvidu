# The images that the server SDK publishers (<sdk>-publisher/) run in, one stage per SDK.
# Never built: OpenViduTestE2e#sdkPublisher reads each image by its stage name, and
# Dependabot updates them in its weekly "livekit-server-sdks" pull request, which the
# server SDK E2E tests gate (.github/dependabot.yml). Node.js and .NET take LTS majors
# only. Dependabot proposes no Node.js major: bump it by hand once it is Active LTS. A new
# .NET major also needs the TargetFramework of dotnet-publisher/dotnet-publisher.csproj:
# push that change to the pull request's branch.
FROM golang:1.27 AS go
FROM node:26 AS node
FROM python:3.15 AS python
FROM rust:1 AS rust
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS dotnet
