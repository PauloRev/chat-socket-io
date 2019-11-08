const express = require("express");
const session = require("express-session");
const sharedSession = require("express-socket.io-session");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const RoomModel = require("./app/models/Room");
const MessageModel = require("./app/models/Message");

const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);

const PORT = process.env.PORT || 3333;
mongoose.Promise = global.Promise;

const expressSession = session({
  secret: "socketio",
  cookie: {
    maxAge: 10 * 60 * 1000
  },
  resave: true,
  saveUninitialized: true
});

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressSession);

io.use(sharedSession(expressSession, { autoSave: true }));

// Routes
app.get("/", (req, res) => {
  res.render("index");
});
app.post("/", (req, res) => {
  // auth
  req.session.user = {
    username: req.body.username
  };
  res.redirect("/rooms");
});

app.get("/rooms", (req, res) => {
  if (!req.session.user) {
    res.redirect("/");
  } else {
    res.render("rooms", {
      username: req.session.username
    });
  }
});

// Socket IO
io.on("connection", socket => {
  // Index Rooms
  RoomModel.find({}, (err, rooms) => {
    socket.emit("roomList", rooms);
  });
  // Store Rooms
  socket.on("addRoom", roomName => {
    const room = new RoomModel({
      name: roomName
    });
    room.save().then(() => {
      io.emit("newRoom", room);
    });
  });
  // User Join in Room
  socket.on("join", roomId => {
    socket.join(roomId);
    MessageModel.find({ room: roomId }).then(msgs => {
      socket.emit("msgsList", msgs);
    });
  });

  // Send new message
  socket.on("sendMsg", msg => {
    const message = new MessageModel({
      author: socket.handshake.session.user.username,
      when: new Date(),
      msgType: "text",
      message: msg.msg,
      room: msg.room
    });
    message.save().then(() => {
      io.to(msg.room).emit("newMsg", message);
    });
    // console.log(msg);
    // console.log(socket.handshake.session);
  });
});

// MongoDB
mongoose
  .connect("mongodb://localhost:27017/chat-socketio", {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
  })
  .then(() => {
    http.listen(PORT, err => {
      if (err) {
        return console.log(`Error: ${err}`);
      }
      return console.log(`Server running in port ${PORT}`);
    });
  });
