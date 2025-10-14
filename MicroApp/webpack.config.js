const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const PORT = 7200;

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: path.resolve(__dirname, 'src/index.jsx'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.[contenthash].js',
    clean: true,
    publicPath: 'auto',
    library: 'microApp',
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
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
    },
    static: {
      directory: path.resolve(__dirname, 'public')
    },
    // 支持跨域
    allowedHosts: 'all',
    // 支持热更新
    hot: true,
    // 支持HTTPS（如果需要）
    // https: true,
    // 支持WebSocket
    webSocketServer: 'ws',
    // 客户端配置
    client: {
      webSocketURL: 'ws://localhost:' + PORT + '/ws'
    }
  }
};
















