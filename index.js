const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = new (require("socket.io").Server)(server);
const log = require("./utils/log");
const api = require("./api/index");
const uuid = require("./utils/uuid");
const bodyParser = require("body-parser");

let renderMapProxy = require("./utils/renderMap.js");
const port = 10086;

app.use(express.static("static"));

const regx = {
  render: {
    match: /^\/render\/[\w|.]+\/?$/,
    replace: /\/render\//
  },
  api: {
    match: /^\/api\/\w+\/\w+\/?/,
    replace: /\/api\//
  }
};
app.use(bodyParser.json())

// app.use(bodyParser.urlencoded())

app.use((req, res, next) => {
  let url = req.url;
  log('request: ' +  url)
  if (url.match(regx.render.match)) {
    url = url.match(regx.render.match)[0]
    const file = url.replace(regx.render.replace , "");
    if (!file) return res.send('console.log("没有东西啊")');
    return renderMapProxy[file].then((d) => {
      res.send(d);
    });
  }else if(url.match(regx.api.match)){
    url = url.match(regx.api.match)[0]
    const pathArr = url.replace(regx.api.replace , "").split('\/');
    const moduleName = pathArr[0];
    const fn = pathArr[1];
    const target = api[moduleName] ? api[moduleName][fn] : null;
    if(target && target.method === req.method.toLowerCase()){
      return target.fn({res , req , next})
    }
  }
  next();
});

let sockets = {};

io.on("connection", (socket) => {
  let _uuid = uuid();
  sockets[_uuid] = {
    id: _uuid,
    socket,
    user: null
  };

  socket.on("api", (arg) => {
    try {
      api[arg.model][arg.fn].fn(arg, sockets[_uuid]).then((d) => {
        socket.send({ ...d, mid: arg.mid });
      });
    } catch (e) {
      log(e.message);
    }
  });

  socket.on("disconnect", () => {
    delete sockets[_uuid]
  });
});

server.listen(port , () => log(`端口: ${port} --- 服务启动成功`));
