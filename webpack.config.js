const path =  require('path');

module.exports = {
    //path to entry paint
    entry: './src/index.js',
    //path and filename of the final output
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'main.js'
    },

    module: {
        rules: [
            {
                test: /\.html$/,
                exclude: /node_modules/,
                use: { loader: 'html-loader' }
            },
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"],
            },
        ]
    },
    mode: 'development'
}
