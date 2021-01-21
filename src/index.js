const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const { generateTimeMessage, generateTimeLocation } = require('./utils/messages')
const Filter = require('bad-words')
const app = express()
const server = http.createServer(app)
const io = socketio(server)
const { addUser,
    removeUser,
    getUser,
    getUsersInRoom } = require('./utils/users')
const PORT = process.env.PORT || 3000
const publicDirPath = path.join(__dirname, '../public')

app.use(express.static(publicDirPath))

// let count=0

io.on('connection', (socket) => {
    console.log('New Websocket Connection')



    socket.on('join', ({ username, room }, callback) => {
        const { user, error } = addUser({ id: socket.id, username, room })
        if (error) {
            return callback(error)
        }
        socket.join(user.room)
        socket.emit('message', generateTimeMessage('Admin',`Hey ${user.username} Welcome To The Room!`))
        socket.broadcast.to(user.room).emit('message', generateTimeMessage('Admin',`${user.username} has joned`))
        io.to(user.room).emit('roomData',{
            room:user.room,
            users:getUsersInRoom(user.room)    
        })
        callback()
    })
    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter()

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed')
        }

        const user=getUser(socket.id)
        
        // socket.emit('ownMessage',generateTimeMessage(user.username,message))
        io.to(user.room).emit('message', generateTimeMessage(user.username,message))
        callback('Delivered!!')
    })



    socket.on('sendLocation', ({ lat, long }, callback) => {
        const user=getUser(socket.id)

        io.to(user.room).emit('locationMessage', generateTimeLocation(user.username,`https://www.google.com/maps/?q=${lat},${long}`))
        callback()
    })
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateTimeMessage('Admin',`${user.username} has left!`))
            io.to(user.room).emit('roomData',{
                room:user.room,
                users:getUsersInRoom(user.room)    
            })
        }
    })
    // socket.emit('countUpdated',count)

    // socket.on('increment',()=>{
    //     count++
    //     // socket.emit('countUpdated',count)
    //     io.emit('countUpdated',count)
    // })
})


server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})