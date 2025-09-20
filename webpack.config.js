import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyPlugin from 'copy-webpack-plugin';
import webpack from 'webpack';

export default {
  target: 'node',
  entry: './src/index.js',
  output: {
    filename: 'index.bundle.js',
    path: path.resolve('./dist')
  },
  mode: 'production',
  externalsPresets: { node: true },
  externals: {
    'log4js': 'commonjs log4js'
  },
  module: {
    rules: []
  },
  resolve: {
    fallback: {
      path: false,
      fs: false,
      child_process: false,
      process: false
    },
    alias: {
      // log4jsの動的require問題を回避
      'log4js/lib/appenders': false
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      templateContent: '<!doctype html><html><body><div id="app"></div></body></html>'
    }),
  // CopyPlugin intentionally left without patterns to avoid schema error in minimal config
  // Add patterns as needed for assets copying in real project
  new CopyPlugin({ patterns: [{ from: 'src/html', to: 'html', noErrorOnMissing: true }] }),
  // log4jsの動的requireによる警告を抑制
  new webpack.ContextReplacementPlugin(
    /log4js\/lib\/appenders/,
    /^\.\/console$/
  ),
  // pkg実行時の動的require警告を追加で抑制
  new webpack.IgnorePlugin({
    resourceRegExp: /^\.\/$/,
    contextRegExp: /log4js/
  }),
  new webpack.ContextReplacementPlugin(
    /log4js/,
    /^$/
  ),
  // 動的requireの警告を一般的に抑制
  new webpack.DefinePlugin({
    'process.env.NODE_ENV': JSON.stringify('production')
  })
  ],
  stats: {
    warnings: false,  // 警告を非表示にする
    warningsFilter: [
      /Cannot resolve/,
      /Dynamic require/,
      /Critical dependency/
    ]
  }
};
