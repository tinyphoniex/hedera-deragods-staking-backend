const express = require('express');
const app = express();
const https = require("https");
const fs = require("fs")
const http = require("http");
const cors = require('cors');

const api = require("./api");

//db
const db = require('./config/db');

const bodyParser = require('body-parser');
const morgan = require('morgan');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cors());
app.use("/api", api);

// DB connect
db.mongoose
  .connect(db.url, {
    maxPoolSize: 10,
    authSource: "admin",
    user: "derateam",
    pass: "@TOP!data250",
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log("Connected to the database!");
  })
  .catch(err => {
    console.log("Cannot connect to the database!", err);
    process.exit();
  });

const httpsPort = 3007;
const privateKey = fs.readFileSync("/etc/letsencrypt/live/app.deragods.com/privkey.pem");
const certificate = fs.readFileSync("/etc/letsencrypt/live/app.deragods.com/fullchain.pem");

const credentials = {
  key: privateKey,
  cert: certificate,
}

const server = https.createServer(credentials, app);

server.listen(httpsPort, () => {
  console.log(`[stake.deragods.com] servier is running at port ${httpsPort} as https.`);
});

// const server = http.createServer(app);

// server.listen(5000, () => {
//   console.log(`servier is running at port 5000 as http.`);
// });