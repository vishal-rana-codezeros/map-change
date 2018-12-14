var express = require('express')
var app = express();



app.use("/",express.static(process.cwd()+'/public'))



app.listen(3000,()=>{console.log("server listening on 3000")})
