const http = require("http");
const net = require("net");
const dns = require('dns');


const { URL } = require("url");

const proxy = http.createServer(onRequest);

function onRequest(client_req, client_res) {
  const { port, hostname } = new URL(client_req.url);
  console.log('===============')
  console.log(port)
  console.log(hostname)
  console.log('===============')

  var options = {
    hostname: hostname,
    port: port,
    path: client_req.url,
    method: client_req.method,
    headers: client_req.headers,
  };

  var req = http.request(options, function (res) {
    client_res.writeHead(res.statusCode, res.headers);
    res.pipe(client_res, {
      end: true,
    });
  });

  client_req.pipe(req, {
    end: true,
  });

  req.on('error', (error) => {
      console.log('in req');
      console.error(error)
  })
}

proxy.on("connect", (req, clientSocket, head) => {
  // Connect to an origin server
  const { port, hostname } = new URL(`http://${req.url}`);

  dns.lookup(hostname, (err, address, family) => {
      // needed as Pi Hole converts all black listed ips to localhost
    if (( !err && address !== '0.0.0.0') && hostname !== '0.0.0.0') {
        const serverSocket = net.connect(port || 80, hostname, () => {
            clientSocket.write(
            "HTTP/1.1 200 Connection Established\r\n" +
                "Proxy-agent: Node.js-Proxy\r\n" +
                "\r\n"
            );
            serverSocket.write(head);
            serverSocket.pipe(clientSocket);
            clientSocket.pipe(serverSocket);
        });
        serverSocket.on('error', (err) => {
            console.log('-------------------------yy')
            console.log(port)
            console.log(hostname)
            console.error(err)
        })
    } 
    else {
        console.log(hostname);
        req.destroy()
        clientSocket.destroy()
    }
  });
});

proxy.on('error', function (error)  {
    console.log('proxy error')
    console.error(error)
})
proxy.on('request', (req) => {
    console.log(req.url)
})

// Now that proxy is running
proxy.listen(3000, "127.0.0.1", () => {});

