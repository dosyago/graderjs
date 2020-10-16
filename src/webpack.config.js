const path = require('path');

const CONFIG = require('./config.js');

module.exports = {
  entry: CONFIG.entry || "./app.js",
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: "service.js"
  },
  optimization: {
    minimize: CONFIG.DEBUG ? false : true
  },
  target: "node",
  node: {
    __dirname: false
  }
};
