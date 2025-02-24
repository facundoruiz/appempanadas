const path = require('path');
const autoprefixer = require('autoprefixer');
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack');
const dotenv = require('dotenv');

// Configuración de variables de entorno
const env = dotenv.config().parsed || {};
const envKeys = Object.keys(env).reduce((prev, next) => {
  prev[`process.env.${next}`] = JSON.stringify(env[next]);
  return prev;
}, {});

module.exports = {
  mode: "production",
  entry: {
    app: './src/index.js',
   
  },
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: 'assets/js/[name].js',
  },
  module: {
    rules: [{
        mimetype: 'image/svg+xml',
        scheme: 'data',
        type: 'asset/resource',
        generator: {
          filename: 'icons/[hash].svg'
        }
      },
      {
        test: /\.(scss)$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  autoprefixer
                ]
              }
            }
          },
          'sass-loader'
        ]
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      }
    ],
  },
  plugins: [
    new webpack.DefinePlugin(envKeys),
    new MiniCssExtractPlugin({
      filename: "assets/css/[name].min.css",
    }),
    new HtmlWebpackPlugin({
      title: "PRUEBA",
      hash: true,
      filename: "index.html",
      template: "./src/index.html",
    }),
    new HtmlWebpackPlugin({
      title: "PRUEBA",
      hash: true,
      filename: "pedido.html",
      template: "./src/pedido.html",
    }),
  ],
  resolve: {
    extensions: ['.js']
  },
  optimization: {
    minimize: true,
  },
}