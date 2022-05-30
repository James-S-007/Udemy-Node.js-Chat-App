const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const app = express()
const server = http.createServer(app)
const io = socketio(server)
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const usersMgmt = require('./utils/users')

const port = process.env.PORT || 3000
const publicPath = path.join(__dirname, '../public')

app.use(express.static(publicPath))


io.on('connection', (socket) => {
    console.log('New client connection')
    
    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = usersMgmt.addUser({ id: socket.id, username, room })
        
        if (error) {
            return callback(error)
        }
        
        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'Welcome!'))  // emit to this connection
        socket.broadcast.to(room).emit('message', generateMessage('Admin', `${username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: usersMgmt.getUsersInRoom(user.room)
        })
        
        callback()        
    })
    

    socket.on('chat_msg', (msg, callback) => {
        const filter = new Filter()
        if (filter.isProfane(msg)) {
            return callback('Profanity is not allowed')
        }

        const user = usersMgmt.getUser(socket.id)
        io.to(user.room).emit('message', generateMessage(user.username, msg))  // emit to all connections
        callback()  // for acknowledgement
    })

    socket.on('disconnect', () => {
        const user = usersMgmt.removeUser(socket.id)
        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left.`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: usersMgmt.getUsersInRoom(user.room)
            })
        }
    })

    socket.on('share_location', (coords, callback) => {
        const user = usersMgmt.getUser(socket.id)
        io.to(user.room).emit('location_msg', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.lat},${coords.lon}`))
        callback()
    })
})



server.listen(port, () => {
    console.log('Server up on port ' + port)
})
