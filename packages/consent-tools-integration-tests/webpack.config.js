const path = require('path')
const globby = require('globby')

// This config is for bundling fixtures in order to serve the pages that webdriver.io will use in its tests.
const files = globby.sync('src/fixtures/*/index.ts', { cwd: __dirname })

const entries = files.reduce((acc, file) => {
  const [dirName] = file.split('/').slice(-2)
  const base = path.basename(dirName)
  return {
    ...acc,
    [base]: path.resolve(__dirname, file),
  }
}, {})

/** @type { import('webpack').Configuration } */
const config = {
  mode: 'development',
  devtool: 'source-map',
  entry: entries,
  output: {
    filename: '[name].bundle.js',
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
