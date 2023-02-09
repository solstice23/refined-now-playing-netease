// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const copyWebpackPlugin = require("copy-webpack-plugin");
const TerserPlugin = require('terser-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const isProduction = process.env.NODE_ENV == "production";

/*const stylesHandler = isProduction
  ? MiniCssExtractPlugin.loader
  : "style-loader";*/

const stylesHandler = "style-loader";

const config = {
  entry: "./src/main.js",
  output: {
    path: path.resolve(__dirname, "dist"),
  },
  devServer: {
    open: true,
    host: "localhost",
  },
  plugins: [
    new copyWebpackPlugin({
        patterns: [
            {
              from: path.resolve(__dirname, "src", "manifest.json"),
              to: path.resolve(__dirname, "dist", "manifest.json"),
            },
            {
              from: path.resolve(__dirname, "src", "preview.webp"),
              to: path.resolve(__dirname, "dist", "preview.webp"),
            }
        ]
    }),
    // new BundleAnalyzerPlugin()

    // Add your plugins here
    // Learn more about plugins from https://webpack.js.org/configuration/plugins/
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      "path": require.resolve("path-browserify")
    }
  },
  module: {
    rules: [
      {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
      },
      {
        test: /\.(js|jsx)$/i,
        loader: "babel-loader",
      },
      {
        test: /\.css$/i,
        use: [stylesHandler, "css-loader"],
      },
      {
        test: /\.s[ac]ss$/i,
        use: [stylesHandler, "css-loader", "sass-loader"],
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
        type: "asset",
      },
      {
        test: /settings-menu\.html/i,
        type: "asset/source"
      }

      // Add your rules for custom modules here
      // Learn more about loaders from https://webpack.js.org/loaders/
    ],
  },
  
  experiments: {
      topLevelAwait: true
  },

  optimization: {
    minimizer: [new TerserPlugin({
      terserOptions: {
        format: {
          comments: false,
        },
      },
      extractComments: false,
    })],
  },
};

module.exports = () => {
  if (isProduction) {
    config.mode = "production";

    //config.plugins.push(new MiniCssExtractPlugin());
  } else {
    config.mode = "development";
  }
  
  
  return config;
};
