let webpack = require("vortex-api/bin/webpack").default;
module.exports = webpack("index", __dirname, 5);
/*
var path = require("path");
var webpack = require("webpack");


module.export = {
  mode: "development",
  entry: path.join(__dirname, "src", "index.ts"),
  target: "electron-renderer",
  node: { __filename: false, __dirname: false },
  output: {
    libraryTarget: "commonjs2",
    filename: "index.js",
    sourceMapFilename: "index.js.map",
    path: path.resolve(__dirname, "dist")
  },
  module: {
    rules: [
      {
        test: /\.ts?$/i,
        loader: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },

  plugins: [],
  resolve: {
    extensions: [".js", ".jsx", ".json", ".ts", ".tsx"]
  },
  devtool: "source-map-inline"
};*/
