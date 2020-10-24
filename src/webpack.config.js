const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: "./service.js",
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: "service.js"
  },
  target: "node",
  node: {
    __dirname: false
  },
  /*
  plugins: [
    new webpack.BannerPlugin({ banner: "#!/usr/bin/env node", raw: true }),
  ]
  */
};
