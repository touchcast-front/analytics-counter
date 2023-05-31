const path = require('path')

// This config is for bundling fixtures in order to serve the pages that webdriver.io will use in its tests.

/** @type { import('webpack').Configuration } */
const config = {
  mode: process.env.NODE_ENV || 'development',
  devtool: 'source-map',
  entry: {
    index: {
      import: path.resolve(__dirname, 'src/fixtures/my-wrapper/index.ts'),
    },
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'public/dist'),
    chunkFilename: '[name].chunk.js',
  },
  target: ['web', 'es5'],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.json',
              transpileOnly: true,
            },
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    port: 9000,
  },
}

module.exports = config
