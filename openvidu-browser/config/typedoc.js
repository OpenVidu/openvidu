module.exports = {
    lib: [
        "lib.dom.d.ts",
        "lib.es5.d.ts",
        "lib.es2015.promise.d.ts",
        "lib.scripthost.d.ts"
    ],
    mode: "file",
    module: "commonjs",
    name: "OpenVidu Browser",
    target: "es5",
    externalPattern: "node_modules",
    exclude: [
        "**/OpenViduInternal/Interfaces/Private/**",
        "**/OpenViduInternal/WebRtcStats/WebRtcStats.ts",
        "**/OpenViduInternal/WebRtcPeer/WebRtcPeer.ts",
        "**/OpenViduInternal/ScreenSharing/**",
        "**/OpenViduInternal/KurentoUtils/**"
    ],
    excludeExternals: true,
    excludePrivate: true,
    theme: "default",
    readme: "none"
}