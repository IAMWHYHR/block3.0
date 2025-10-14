const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const PORT = 7500;

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: path.resolve(__dirname, 'src/index.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.[contenthash].js',
    clean: true,
    publicPath: 'auto',
    library: 'mainApp3',
    libraryTarget: 'umd'
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: 'babel-loader'
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public/index.html')
    }),
    // new HtmlWebpackPlugin({
    //   template: path.resolve(__dirname, 'public/test-collaboration.html')
    // })
  ],
  devServer: {
    port: PORT,
    historyApiFallback: true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    static: {
      directory: path.resolve(__dirname, 'public')
    }
  }
};









