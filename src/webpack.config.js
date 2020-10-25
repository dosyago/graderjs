const path = require('path');

const CONFIG = require('./config.js');

module.exports = {
  entry: CONFIG.entry || "./app.js",
  optimization: {
    minimize: false
  },
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
