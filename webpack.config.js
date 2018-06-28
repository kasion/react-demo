var webpack = require('webpack');
var path = require("path")
var fs = require('fs');
var port = 2501;

var context = path.resolve('./src/');

var entries = fs
    .readdirSync(context)
    .filter(entry => fs.statSync(path.join(context, entry)).isDirectory())
    .filter(entry => ['.svn', 'components'].indexOf(entry) < 0 )
;

var option = {
    context: context,
    entry: {
        common: ['babel-polyfill']
    },
    output: {
        path: path.resolve('./dist'),
        filename: '[name]_[hash:4].js'
    },
    module: {
        loaders: [{//保持第一行,后面会动态修改的
            test: /\.js$/i,
            exclude:path.resolve('./node_modules'),
            loaders: ['babel?presets[]=es2015&presets[]=react&presets[]=stage-2']
        }, {
            test: /\.(png|jpg)$/i,
            loader: 'url?limit=8000&name=assets/imgs/[name]_[hash:8].[ext]'
        }, {
            test: /\.css$/i, //module css，将class和id局部化
            loader: 'style!css?modules&localIdentName=[path]_[name]_[local]_[hash:base64:5]!postcss'
        }, {
            test: /\.(woff|woff2|ttf|eot|svg)\/?.*$/i,
            loader: 'file?name=assets/fonts/[name].[ext]'
        }, {
            test: /\.ico$/i,
            loader: 'file'
        }
        ],
    },
    postcss: [
        require('postcss-nested')(),
        require('postcss-cssnext')()
    ],

    plugins: [
        //把共享组件提取出来放common.js里面
        new webpack.optimize.CommonsChunkPlugin({name: 'common',minChunks: 4,filename: 'common_[hash:5].js'})
    ],
    resolve: {
        modulesDirectories: ['node_modules', 'components', '.'],
    },
    devServer : {
        publicPath: '/apolloDAT/',
        hot: false,
        inline: false,
        progress: false,
        https:false,
        devtool : "eval-source-map",
        port: port,
        host:'0.0.0.0',
        disableHostCheck: true,
		
        proxy:{
            '**':{
                changeOrigin:true,
                //target:'http://www.baidu.com/',
               
            }
        }
    }
};

var debug = require('process').argv.indexOf('-d') >= 0;

var html = require('html-webpack-plugin');

//读取源码目录，自动把目录下的项目加入到config里

entries.forEach(entry => {
    option.entry[entry] = ['./' + entry]; 

    option.plugins.push(new html({
        template: entry + '/index.html', //把 webpack/[entry]/index.html 
        filename: entry + '.html', //copy 到 dist/[entry].html
        favicon:'webicon.ico',
        chunks: ['common',entry] //并且自动加入common.js和[entry].js的引用
    }));
})


if (debug) { //如果是开发模式
    option.plugins.push(new webpack.NoErrorsPlugin());
    
    //打开浏览器
    require('child_process').exec("start http://" + getLocalIP() + ":" + port + "/apolloDAT/");
    require('child_process').exec("open http://" + getLocalIP() + ":" + port + "/apolloDAT/");
}else{
    option.plugins.push(new webpack.DefinePlugin({"process.env": { NODE_ENV: '"production"'}}));
    option.plugins.push(new webpack.optimize.UglifyJsPlugin({compress: {warnings: false}}));
}

//导出
module.exports = option;

function getLocalIP() {
    var nets = require('os').networkInterfaces();
    for (var devname in nets) {
        if (devname.indexOf('Pseudo') >= 0) continue;

        var device = nets[devname];
        for (var i in device) {
            var network = device[i];
            var head = network.address.split(".")[0];

            if (network.family == 'IPv4' && (head == "192" || head == "10" || head == "172")) {
                return network.address;
            }
        }
    }
    return "localhost";
}
