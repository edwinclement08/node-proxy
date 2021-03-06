const http = require("http");
const net = require("net");
const dns = require('dns');

const { URL } = require("url");

const proxy = http.createServer(onRequest);

function onRequest(client_req, client_res) {
  const { port, hostname } = new URL(client_req.url);

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
      console.log('In HTTP Req');
      console.error(error)
  })
}

proxy.on("connect", (req, clientSocket, head) => {
  // Connect to an origin server
  const { port, hostname } = new URL(`http://${req.url}`);

  dns.lookup(hostname, (err, address) => {
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
            console.log(`Error on CONNECT request for: ${hostname}:${port} `)
            console.error(err)
        })
        // clientSocket.on('error', (err) => {
        //   console.log(err)
        // })
        serverSocket.on('close', (err) => console.log('S close') )
        serverSocket.on('connect', (err) => console.log('S connect') )
        serverSocket.on('data', (err) => console.log('S data') )
        serverSocket.on('drain', (err) => console.log('S drain') )
        serverSocket.on('end', (err) => console.log('S end') )
        serverSocket.on('error', (err) =>  {console.log('S error'); console.log(err)} )
        serverSocket.on('lookup', (err) => console.log('S lookup') )
        serverSocket.on('ready', (err) => console.log('S ready') )
        serverSocket.on('timeout', (err) => console.log('S timeout') )

        clientSocket.on('close', (err) => console.log('C close') )
        clientSocket.on('connect', (err) => console.log('C connect') )
        clientSocket.on('data', (err) => console.log('C data') )
        clientSocket.on('drain', (err) => console.log('C drain') )
        clientSocket.on('end', (err) => console.log('C end') )
        clientSocket.on('error', (err) => {console.log('C error'); console.log(err)} )
        clientSocket.on('lookup', (err) => console.log('C lookup') )
        clientSocket.on('ready', (err) => console.log('C ready') )
        clientSocket.on('timeout', (err) => console.log('C timeout') )
        // clientSocket.on((e) => {console.log(e)})
    } 
    else {
        console.log(`Blocked: ${hostname}`);
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
    console.log(`HTTP Request: ${req.url}`)
})

proxy.listen(3000, "127.0.0.1", () => {});

