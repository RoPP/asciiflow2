'use strict';

const webpack = require("webpack");

module.exports = {
  context: __dirname + "/js-lib",
  entry: {
    app: "./launch.js",
  },
  output: {
    path: __dirname + "/dist",
    filename: "[name].bundle.js",
    publicPath: "assets",
  },
  devServer: {
    contentBase: __dirname,
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  devtool: 'source-map',
  module: {
    loaders: [
      {
        test: /\.ts$/,
        loader: 'awesome-typescript-loader'
      }
    ]
  }
};
