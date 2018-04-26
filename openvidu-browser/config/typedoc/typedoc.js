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
        "**/OpenViduInternal/VersionAdapter.ts"
    ],
    excludeExternals: true,
    excludePrivate: true,
    theme: "./config/typedoc/custom-theme",
    plugin: [
        "typedoc-plugin-sourcefile-url",
    ],
    'sourcefile-url-prefix': "https://github.com/OpenVidu/openvidu/tree/master/openvidu-browser/src/",
    readme: "none"
}