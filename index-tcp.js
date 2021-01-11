var net = require("net");

process.on("uncaughtException", function (error) {
  console.error(error);
});

let host,
  port;

// contains localsocket port -> remoteSocket mapping
let isConnectedMap = {

}

function applyCallbacks(localsocket, remotesocket) {
  remotesocket.on("connect", (error) => {
    console.log("connected to remote Err:", error);
  });

  remotesocket.on("data", function (data) {
    console.log(
      "%s:%d - writing data to local",
      localsocket.remoteAddress,
      localsocket.remotePort
    );
    var flushed = localsocket.write(data);
    if (!flushed) {
      console.log("  local not flushed; pausing remote");
      remotesocket.pause();
    }
  });

  localsocket.on("drain", function () {
    console.log(
      "%s:%d - resuming remote",
      localsocket.remoteAddress,
      localsocket.remotePort
    );
    remotesocket.resume();
  });

  remotesocket.on("drain", function () {
    console.log(
      "%s:%d - resuming local",
      localsocket.remoteAddress,
      localsocket.remotePort
    );
    localsocket.resume();
  });

  localsocket.on("close", function (had_error) {
    console.log(
      "%s:%d - closing remote",
      localsocket.remoteAddress,
      localsocket.remotePort
    );
    remotesocket.end();
    connected = false;
    // remotesocket = undefined;
  });

  remotesocket.on("close", function (had_error) {
    console.log(
      "%s:%d - closing local",
      localsocket.remoteAddress,
      localsocket.remotePort
    );
    localsocket.end();
    connected = false;
    // remotesocket = undefined;
  });
  remotesocket.on("error", (err) => {
    console.log("Error on remotesocket");
    connected = false;

    remotesocket = new net.Socket();
    remotesocket.connect({ port, host });
    console.log(err);
    localsocket.end();
  });
  localsocket.on("error", (err) => {
    console.log(localsocket.destroyed);
    console.log(remotesocket.destroyed);
    console.log("Error on localsocket");

    connected = false;
    remotesocket.end();
    remotesocket = new net.Socket();
    remotesocket.connect({ port, host });
    console.log(err);
  });
}

var server = net.createServer(function (localsocket) {
  localsocket.on("connect", function (data) {
    console.log(
      ">>> connection #%d from %s:%d",
      server.connections,
      localsocket.remoteAddress,
      localsocket.remotePort
    );
  });

  localsocket.on("data", function (data) {
    console.log("-------------%------");
    headers = data.toString("utf-8");
    lines = headers.split("\n");
    const req_details = lines[0].split(" ").map((x) => x.trim(x));

    connection = isConnectedMap[localsocket.remotePort];
    if (connection && connection.https) {
      remotesocket = connection.socket;
      flushed = remotesocket.write(data);
      if (!flushed) {
        console.log("  local not flushed; pausing remote");
        localsocket.pause();
      }
    } else {
      if (req_details[0] === "CONNECT") {
        const host_and_port = req_details[1].split(":");
        console.log(req_details[1]);
        console.log(host_and_port);
        host = host_and_port[0];
        port = host_and_port[1];

        remotesocket = new net.Socket();
        remotesocket.connect({ port, host });
        isConnectedMap[localsocket.remotePort] = { socket: remotesocket, https: true };

        applyCallbacks(localsocket, remotesocket);
        flushed = localsocket.write("HTTP/1.1 200 OK\r\n\n");
        if (!flushed) {
          console.log("local not flushed; pausing remote");
          remotesocket.pause();
        }
      } else if (
        [
          "GET",
          "HEAD",
          "POST",
          "PUT",
          "DELETE",
          "OPTIONS",
          "TRACE",
          "PATCH",
        ].includes(req_details[0])
      ) {
        const match_pattern = /(https?):\/\/([A-Za-z_\-0-9.]+)(:\d+)?.*/;
        const host_and_port = match_pattern.exec(req_details[1]);

        host = host_and_port[2].replace(/\/$/, "");
        port = host_and_port[3];

        if (!port) {
          port = host_and_port[0] === "https" ? 443 : 80;
        } else {
          port = port.slice(1);
        }
        remotesocket = new net.Socket();
        remotesocket.connect({ port, host });
        flushed = remotesocket.write(data);
        isConnectedMap[localsocket.remotePort] = { socket: remotesocket, https: false };
        applyCallbacks(localsocket, remotesocket)
      }
    //    else {
    //     remotesocket.connect({ port, host });
    //     connected = true;
    //     flushed = remotesocket.write(data);
    //     if (!flushed) {
    //       console.log("  local not flushed; pausing remote");
    //       localsocket.pause();
    //     }
    //   }
    }

    // if (!flushed) { console.log("  remote not flushed; pausing local");
    //   localsocket.pause();
    // }
  });
});

server.listen(3000);
