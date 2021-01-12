var https = require('https')

var fs = require('fs');
const net = require("net");
const dns = require('dns');

const { URL } = require("url");

 
var server = https.createServer({
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
}, onRequest)

function onRequest(client_req, client_res) {
    const { port, hostname } = new URL(client_req.url);
    console.log(port, hostname)
  
    var options = {
      hostname: hostname,
      port: port,
      path: client_req.url,
      method: client_req.method,
      headers: client_req.headers,
    };
  
    var req = https.request(options, function (res) {
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
 
server.on("connect", (req, clientSocket, head) => {
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
      } 
      else {
          console.log(`Blocked: ${hostname}`);
          req.destroy()
          clientSocket.destroy()
      }
    });
});
  
server.listen(4443, function () {
  console.log('The server is running on https://localhost')
})