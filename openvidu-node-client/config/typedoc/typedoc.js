module.exports = {
    lib: [
        "lib.dom.d.ts",
        "lib.es5.d.ts",
        "lib.es2015.promise.d.ts",
        "lib.scripthost.d.ts"
    ],
    mode: "file",
    module: "commonjs",
    name: "OpenVidu Node Client",
    target: "es5",
    externalPattern: "node_modules",
    excludeExternals: true,
    excludePrivate: true,
    theme: "./config/typedoc/custom-theme/bin",
    plugin: [
        "typedoc-plugin-sourcefile-url",
    ],
    'sourcefile-url-prefix': "https://github.com/OpenVidu/openvidu/tree/master/openvidu-node-client/src/",
    readme: "none"
}