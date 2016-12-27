'use strict';

const webpack = require("webpack");
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  context: __dirname + "/src",
  entry: {
    app: "./app/index.ts",
  },
  output: {
    path: __dirname + "/dist",
    filename: "[name].bundle.js",
  },
  devServer: {
    contentBase: __dirname + "/src/assets",
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
  },
  plugins: [new HtmlWebpackPlugin({
    template: 'index.html'
  })]
};
