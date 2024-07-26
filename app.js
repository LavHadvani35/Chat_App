require('dotenv').config();

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/dynamic-chat-app');

const app = require('express')();
const http = require('http').Server(app);

const userRoute = require('./routes/userRoute');
const User = require('./models/userModel');
const Chat = require('./models/chatModel');

app.use('/', userRoute);

const io = require('socket.io')(http);
var usp = io.of('/user-namespace');
usp.on('connection', async function (socket) {
    console.log('User Connected...');

    var userId = socket.handshake.auth.token;
    await User.findByIdAndUpdate({ _id: userId }, { $set: { is_online: '1' } });

    //User Broadcast Online Status
    socket.broadcast.emit('getOnlineUser', { user_id: userId });

    socket.on('disconnect', async function () {
        console.log('User Disconnected!!');
        var userId = socket.handshake.auth.token;
        await User.findByIdAndUpdate({ _id: userId }, { $set: { is_online: '0' } });

        //User Broadcast Offline Status
        socket.broadcast.emit('getOfflineUser', { user_id: userId });
    });

    // Chatting Implementation
    socket.on('newChat', function (data) {
        socket.broadcast.emit('loadNewChat', data);
    })

    //Load Old Chat 
    socket.on('existsChat', async function (data) {
        var chats = await Chat.find({
            $or: [
                { sender_id: data.sender_id, receiver_id: data.receiver_id },
                { sender_id: data.receiver_id, receiver_id: data.sender_id }
            ]
        });
        socket.emit('loadChats', { chats: chats });
    });

    //Delete Chats
    socket.on('chatDeleted', function (id) {
        socket.broadcast.emit('chatMsgDeleted', id);
    });

    //Update Chats
    socket.on('chatUpdated', function (data) {
        socket.broadcast.emit('chatMsgUpdated', data);
    })

});

http.listen(3030, function () {
    console.log('Server is Running');
})