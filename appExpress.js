const express = require('express')
const appExpress = express()
const bodyParser = require('body-parser')
const busboy = require('connect-busboy')
const {htmlToJson} = require("./htmlToJson/htmlToJson.js")
const fs = require('fs')
const multer = require('multer')

//用于输出 json文件和html文件
const path = require('path');
const writeFile = require('write');
const EventEmitter = require('events');
class MyEmitter extends EventEmitter {
}
const myEmitter = new MyEmitter()

let deleteFolder = function(path) {
  let files = [];
  if( fs.existsSync(path) ) {
    files = fs.readdirSync(path);
    files.forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.statSync(curPath).isDirectory()) { // recurse
        deleteFolder(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

myEmitter.on('success', function (obj) {
  deleteFolder(obj.dir)
  /*let fileBaseName = path.basename(obj.path, '.docx')
  let time = new Date().getTime()
  writeFile(path.join(__dirname, `./fileOfJsonAndHtml/${time}__${obj.i + 1}__${fileBaseName}/${fileBaseName}.json`), JSON.stringify(obj.jsonObj), (err) => {
    if (err) {
      console.log(err)
      return
    }
    console.log('json_success！')
  })
  writeFile(path.join(__dirname, `./fileOfJsonAndHtml/${time}__${obj.i + 1}__${fileBaseName}/${fileBaseName}.html`), obj.temp, (err) => {
    if (err) {
      console.log(err)
      return
    }
    console.log('html_success！')
  })*/
})

appExpress.use(busboy())

appExpress.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

appExpress.use(bodyParser.json())
appExpress.use(bodyParser.urlencoded({extended: false}))


appExpress.post('/word-to-json', function (req, res) {
  htmlToJson(res, req.body.docxList, myEmitter)
})

appExpress.get('/hello', function (req, res) {
  res.send('hello！')
})

appExpress.post('/word-to-json-2', multer({
  dest: 'uploads'
}).array('file', 10), function (req, res, next) {
  let time = new Date().getTime()
  fs.mkdirSync('./static/' + time + '/')
  let files = req.files;
  console.log(files)
  if (files.length === 0) {
    res.render("error", {message: "上传文件不能为空！"});
    return
  } else {
    let fileInfos = [];
    for (let i in files) {
      let file = files[i];
      let fileInfo = {};


      fs.renameSync('./uploads/' + file.filename, './static/' + time + '/' + file.originalname);//这里修改文件名。
      //fs.unlinkSync('./uploads/' + file.filename)
      //获取文件基本信息
      fileInfo.mimetype = file.mimetype;
      fileInfo.originalname = file.originalname;
      fileInfo.size = file.size;
      fileInfo.path = './static/' + time + '/' + file.originalname;
      fileInfo.dir = './static/' + time + '/';

      fileInfos.push(fileInfo);
    }
    htmlToJson(res, fileInfos, myEmitter)
    // 设置响应类型及编码
    /*res.set({
     'content-type': 'application/json; charset=utf-8'
     });
     res.end("success!");*/
  }
})

appExpress.post('/hi2', function (req, res) {
  if (req.busboy) {
    req.busboy.on('file', function (filedname, file, filename, encoding, mimetype) {
      var saveTo = path.join(__dirname, 'static/' + filename)
      file.pipe(fs.createWriteStream(saveTo))
      file.on('end', function () {
        console.log('1111')
        res.json({
          success: true
        })
      })
    })
    req.pipe(req.busboy)
  }
  //res.send('hi！')
})

appExpress.listen(3004)
console.log('3004 success')

