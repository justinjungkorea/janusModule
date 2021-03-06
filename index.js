const http = require('http');
const https = require('https');
const fs = require('fs');
const express = require('express');
const app = express();
const path = require('path');
const PORT = 4545;

app.set('views', path.join(__dirname,'/'));
app.set('view engine', 'html');

// const options = {
//   key: fs.readFileSync('./ssl/ktgenie.key'),
//   cert: fs.readFileSync('./ssl/ktgenie_cert.pem'),
//   ca: fs.readFileSync('./ssl/RootCA.crt'),
//   passphrase: 'kpoint'
// }

app.use(express.static('public'));

app.get('/home', (req,res)=>{
    res.sendFile(__dirname +'/public/views/home.html')
})

http.createServer(app).listen(PORT, ()=>{
  // https.createServer(options, app).listen(PORT, ()=>{
    console.log(`✅ Server running on http://localhost:${PORT}/home`);
})
