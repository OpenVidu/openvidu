const webpack = require("webpack");

module.exports = {
  plugins: [
    new webpack.NormalModuleReplacementPlugin(/node:/, (resource) => {
      resource.request = resource.request.replace(/^node:/, "");
    }),
  ]
};
