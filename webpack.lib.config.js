const path = require('path')

module.exports = (env, argv) => {
	return {
		mode: env.production ? 'production' : 'development',
		devtool: env.production ? false : 'eval',
		entry: './src',
		output: {
			filename: 'sukkula.js',
			path: path.resolve(__dirname, 'dist'),
			library: 'Sukkula',
			libraryTarget: 'umd'
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
