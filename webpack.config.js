const path = require('path');

const buildPath = path.resolve(__dirname, 'dist');

const client = {
    entry: './src/client/client.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: ['ts-loader', 'eslint-loader'],
                exclude: /node_modules/,
            },
        ],
    },
    optimization: {
        minimize: true,
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: 'client.js',
        path: buildPath,
    },
};

module.exports = [client];
