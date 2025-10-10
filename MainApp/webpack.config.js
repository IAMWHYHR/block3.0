const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const PORT = 7100;

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: path.resolve(__dirname, 'src/index.jsx'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.[contenthash].js',
    clean: true,
    publicPath: '/'
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
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public/index.html')
    })
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










