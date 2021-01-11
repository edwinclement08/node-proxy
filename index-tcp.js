const { METHODS } = require("http");
var net = require("net");

process.on("uncaughtException", function (error) {
  console.error(error);
});

var server = net.createServer(function (localsocket) {
  var remotesocket = new net.Socket();

  localsocket.on("connect", function (data) {
    console.log(
      ">>> connection #%d from %s:%d",
      server.connections,
      localsocket.remoteAddress,
      localsocket.remotePort
    );
  });
  let host, port;

  localsocket.on("data", function (data) {
    console.log("--------------------");
    console.log(data.toString("utf-8"));
    headers = data.toString("utf-8");
    lines = headers.split("\n");
    const req_details = lines[0].split(" ").map((x) => x.trim(x));

    if (req_details[0] === 'CONNECT') {
        const match_pattern = /([^:]+)(:\d+)?.*/;
        const host_and_port = match_pattern.exec(req_details[1]);
        host = host_and_port[1].replace(/\/$/, "");
        port = host_and_port[2].replace(/^:/, '');

    } else {
        const match_pattern = /(https?):\/\/([^:]+)(:\d+)?.*/;
        const host_and_port = match_pattern.exec(req_details[1]);
        
        host = host_and_port[2].replace(/\/$/, "");
        port = host_and_port[3];

        if (!port) {
        port = host_and_port[0] === "https" ? 443 : 80;
        } else {
        port = port.slice(1);
        }

    }
        console.log(host, port)
    remotesocket.connect({port, host});

    console.log("--------------------");

    console.log(
      "%s:%d - writing data to remote",
      localsocket.remoteAddress,
      localsocket.remotePort
    );
    var flushed = remotesocket.write(data);
    if (!flushed) {
      console.log("  remote not flushed; pausing local");
      localsocket.pause();
    }
  });
  remotesocket.on('connect', (error) => {
      console.log('connected');
  })

    remotesocket.on('data', function(data) {
      console.log("%s:%d - writing data to local",
        localsocket.remoteAddress,
        localsocket.remotePort
      );
      console.log(data.toString())
      var flushed = localsocket.write(data);
      if (!flushed) {
        console.log("  local not flushed; pausing remote");
        remotesocket.pause();
      }
    });

    localsocket.on('drain', function() {
      console.log("%s:%d - resuming remote",
        localsocket.remoteAddress,
        localsocket.remotePort
      );
      remotesocket.resume();
    });

    remotesocket.on('drain', function() {
      console.log("%s:%d - resuming local",
        localsocket.remoteAddress,
        localsocket.remotePort
      );
      localsocket.resume();
    });

    localsocket.on('close', function(had_error) {
      console.log("%s:%d - closing remote",
        localsocket.remoteAddress,
        localsocket.remotePort
      );
      remotesocket.end();
    });

    remotesocket.on('close', function(had_error) {
      console.log("%s:%d - closing local",
        localsocket.remoteAddress,
        localsocket.remotePort
      );
      localsocket.end();
    });
});

server.listen(3000);

console.log("fwewef");
// console.log("redirecting connections from 127.0.0.1:%d to %s:%d", localport, remotehost, remoteport);
