const net = require("net");

process.on("uncaughtException", function (error) {
  console.error(error);
});

let host, port, currentPrintPort = null, isConnectedMap = { } ;


function applyCallbacks(localsocket, remotesocket) {
  remotesocket.on("connect", (error) => {
    if(error) {
      console.error(`\nFailed to Connect to remote ${remotesocket.remoteAddress} due to `, error);
    } else {
      console.log(`\n${localsocket.remoteAddress}:${localsocket.remotePort} connected to ${remotesocket.remoteAddress}:${remotesocket.remotePort}`);
      currentPrintPort = null;
    }
  });

  remotesocket.on("data", function (data) {
    if(currentPrintPort === localsocket.remotePort) {
      process.stdout.write('<')
    } else {
      process.stdout.write(`\n${localsocket.remoteAddress}:${localsocket.remotePort} <`)
      currentPrintPort = localsocket.remotePort;
    }
    const flushed = localsocket.write(data);
    if (!flushed) {
      console.log("  local not flushed; pausing remote");
      remotesocket.pause();
    }
  });

  localsocket.on("drain",  () => {
    console.log( "\n%s:%d - resuming remote", localsocket.remoteAddress, localsocket.remotePort );
    remotesocket.resume();
  });

  remotesocket.on("drain",  () => {
    console.log( "\n%s:%d - resuming local", localsocket.remoteAddress, localsocket.remotePort );
    localsocket.resume();
  });

  localsocket.on("close",  () => {
    if(currentPrintPort === localsocket.remotePort) {
      process.stdout.write(' ended(local)\n');
      currentPrintPort = null;
    } else {
      process.stdout.write(`${localsocket.remoteAddress}:${localsocket.remotePort} ended(local)\n`);
      currentPrintPort = null;
    }
    remotesocket.end();
    isConnectedMap[localsocket.remotePort] = undefined;
  });

  remotesocket.on("close", () => {
    if(currentPrintPort === localsocket.remotePort) {
      process.stdout.write(' ended(remote)\n');
      currentPrintPort = null;
    } else {
      process.stdout.write(`${localsocket.remoteAddress}:${localsocket.remotePort} ended(remote)\n`);
      currentPrintPort = null;
    }
    localsocket.end();
    isConnectedMap[localsocket.remotePort] = undefined;
  });

  remotesocket.on("error", (err) => {
    isConnectedMap[localsocket.remotePort] = undefined;
    localsocket.end();
  });

  localsocket.on("error", (err) => {
    isConnectedMap[localsocket.remotePort] = undefined;
  });
}

const server = net.createServer(function (localsocket) {
  localsocket.on("data", function (data) {
    headers = data.toString("utf-8");
    lines = headers.split("\n");
    const req_details = lines[0].split(" ").map((x) => x.trim(x));

    connection = isConnectedMap[localsocket.remotePort];
    if (connection && connection.https) {
      remotesocket = connection.socket;
      if(currentPrintPort === localsocket.remotePort) {
        process.stdout.write('>')
      } else {
        process.stdout.write(`\n${localsocket.remoteAddress}:${localsocket.remotePort} >`)
        currentPrintPort = localsocket.remotePort;
      }

      flushed = remotesocket.write(data);
      if (!flushed) {
        console.log("  local not flushed; pausing remote");
        localsocket.pause();
      }
    } else {
      if (req_details[0] === "CONNECT") {
        const host_and_port = req_details[1].split(":");
        host = host_and_port[0];
        port = host_and_port[1];

        remotesocket = new net.Socket();
        remotesocket.connect({ port, host });
        isConnectedMap[localsocket.remotePort] = { socket: remotesocket, https: true };

        applyCallbacks(localsocket, remotesocket);
        if(currentPrintPort === localsocket.remotePort) {
          process.stdout.write('<')
        } else {
          process.stdout.write(`\n${localsocket.remoteAddress}:${localsocket.remotePort} >`)
          currentPrintPort = localsocket.remotePort;
        }
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
        if (!flushed) { console.log("  remote not flushed; pausing local");
          localsocket.pause();
        }
        isConnectedMap[localsocket.remotePort] = { socket: remotesocket, https: false };
        applyCallbacks(localsocket, remotesocket)
      }
    }

  });
});

server.listen(3000);
