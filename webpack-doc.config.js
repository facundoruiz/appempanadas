const path = require("path");
const autoprefixer = require("autoprefixer");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin"); //extrae css

const webpack = require("webpack");
const dotenv = require("dotenv");

const env = dotenv.config().parsed;
const envKeys = Object.keys(env).reduce((prev, next) => {
  prev[`process.env.${next}`] = JSON.stringify(env[next]);
  return prev;
}, {});

module.exports = {
  mode: "development",
  entry: {
    app: './src/index.js',
    
  },
  output: {
    path: path.resolve(__dirname, 'docs'),
    filename: 'assets/js/[name].js',
  },
  resolve: {
    modules: [
      path.resolve(__dirname, "node_modules"), // Asegura que node_modules se busca
    ],
  },
  module: {
    rules: [
      {
        mimetype: "image/svg+xml",
        scheme: "data",
        type: "asset/resource",
        generator: {
          filename: "assets/svg/[hash].svg",
        },
      },
      { //css para extraer
        test: /\.(png|jpg|jpeg|svg|gif)$/i,
        type: 'asset/resource',

        generator: {
          filename: 'assets/img/[hash][ext]'

        }
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
      {
        test: /\.(scss)$/,
        use: [
          {
            // Adds CSS to the DOM by injecting a `<style>` tag
            loader: "style-loader",
          },
          {
            // Interprets `@import` and `url()` like `import/require()` and will resolve them
            loader: "css-loader",
          },
          {
            // Loader for webpack to process CSS with PostCSS
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: () => [autoprefixer],
              },
            },
          },
          {
            // Loads a SASS/SCSS file and compiles it to CSS
            loader: "sass-loader",
          },
        ],
      },
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
      //  	template: 'src/template.html'
    }),
    new HtmlWebpackPlugin({
      title: "PRUEBA",
      hash: true,
      filename: "pedido.html",
      template: "./src/pedido.html",
      //  	template: 'src/template.html'
    }),
   
  ],
  resolve: {
    extensions: [".js"],
  },
  devServer: {
    static: path.resolve(__dirname, "./docs/"),
    hot: true,
    server: {
      type: "https", // ✅ Correct for Webpack 5
    },
  },
};
