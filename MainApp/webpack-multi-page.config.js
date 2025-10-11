const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const PORT = 7100;

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: {
    main: path.resolve(__dirname, 'src/index.jsx'),
    admin: path.resolve(__dirname, 'src/admin.jsx'),
    mobile: path.resolve(__dirname, 'src/mobile.jsx')
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
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
    // 主页面
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public/index.html'),
      filename: 'index.html',
      chunks: ['main'],
      title: 'Main App'
    }),
    // 管理页面
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public/admin.html'),
      filename: 'admin.html',
      chunks: ['admin'],
      title: 'Admin Panel'
    }),
    // 移动端页面
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public/mobile.html'),
      filename: 'mobile.html',
      chunks: ['mobile'],
      title: 'Mobile App'
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





