'use strict';

const webpack = require("webpack");
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  context: __dirname + "/src",
  entry: {
    app: "./index.ts",
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
      },
      {
        test: /\.scss$/,
        loaders: ["style-loader", "css-loader", "sass-loader"]
      },
      {
        test: /\.(png|gif|jpe?g|svg)$/i,
        loader: 'url-loader',
        query: {
          limit: 10000,
        }
      },
      {
        test: /\.html/,
        loader: 'html-loader',
      }
    ]
  },
  plugins: [new HtmlWebpackPlugin({
    template: 'index.html'
  })]
};
