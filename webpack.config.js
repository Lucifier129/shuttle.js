const path = require('path')

module.exports = (env, argv) => {
	return {
		mode: env.production ? 'production' : 'development',
		devtool: env.production ? false : 'eval',
		entry: {
			example: './example/src'
		},
		output: {
			filename: '[name].js',
			path: path.resolve(__dirname, 'example/dist')
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
		},
		resolve: {
			alias: {
				'shuttle.js': path.resolve(__dirname, 'src')
			}
		}
	}
}
