const http = require("http");
const fs = require("fs");
const path = require("path");
const livereload = require("livereload");

module.exports = class LiveReloadAndServe {
  constructor(path) {
    this.path = path;
  }

  listen(port = 8080) {
    const liveserver = livereload.createServer();
    liveserver.watch(path.join(process.cwd(), this.path));

    this.server = http.createServer((req, res) => {
      const url = req.url.endsWith("/") ? req.url + "index.html" : req.url;
      const fullPath = path.join(process.cwd(), this.path, url);
      fs.readFile(fullPath, function(err, data) {
        if (err) {
          res.writeHead(404);
          res.end(JSON.stringify(err));
          return;
        }
        res.writeHead(200);

        res.write(data);

        if (url.endsWith(".html")) {
          res.write(`<script>
            document.write('<script src="http://' + (location.host || 'localhost').split(':')[0] +
            ':35729/livereload.js?snipver=1"></' + 'script>')
          </script> `);
        }

        res.end();
      });
    });

    this.server.listen(port);
  }
};
