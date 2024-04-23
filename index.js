var express = require('express');
var app = express();
var server = require('http').createServer(app);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));
//app.use('/node_modeles/', express.static(path.join(__dirname, 'node_models')));


server.listen(3000);
app.get('/', function(request, respons){
    respons.sendFile(__dirname + '/index.html');
});