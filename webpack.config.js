const path = require('path')

module.exports = (env, argv) => {
  return {
    mode: env.production ? 'production' : 'development',
    devtool: env.production ? false : 'eval',
    entry: {
      shuttle: './src/index'
    },
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, 'dist')
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /(node_modules|bower_components)/,
          use: {
            loader: 'babel-loader'
          }
        }
      ]
    }
  }
}
