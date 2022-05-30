const socket = io()

// Elements
const $messageForm = document.querySelector('#submit_search')
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')
const $shareLocationButton = document.querySelector('#share_location')
const $messages = document.querySelector('#messages')

// Templates
const messageTemplate = document.querySelector('#message_template').innerHTML
const locationTemplate = document.querySelector('#location_template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar_template').innerHTML

// Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })

const autoScroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild

    // Height of the last message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin

    // Visible Height
    const visibleHeight = $messages.offsetHeight
    
    // Height of messages container
    const containerHeight = $messages.scrollHeight

    // How far have I scrolled
    const scrollOffset = $messages.scrollTop + visibleHeight

    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight

    }
}

socket.on('message', (msg) => {
    const html = Mustache.render(messageTemplate, {
        username: msg.username,
        msg: msg.text,
        createdAt: moment(msg.createdAt).format('h:mm:ss')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoScroll()
})

socket.on('location_msg', (msg) => {
    const html = Mustache.render(locationTemplate, {
        username: msg.username,
        location: msg.location,
        createdAt: moment(msg.createdAt).format('h:mm:ss')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoScroll()
})

socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })

    document.querySelector('#sidebar').innerHTML = html
})

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault()  // prevent refresh

    $messageFormButton.setAttribute('disabled', 'disabled')
    const msg = e.target.elements.message.value
    socket.emit('chat_msg', msg, (err) => {
        $messageFormButton.removeAttribute('disabled')
        $messageFormInput.value = ''
        $messageFormInput.focus()
        if (err) {
            return console.log(err)
        }

        console.log('Message delivered')
    })  // acknowledgement cb
})

$shareLocationButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
        return alert('Geolocation is not supported by your browser')
    }

    $shareLocationButton.setAttribute('disabled', 'disabled')
    navigator.geolocation.getCurrentPosition((position) => {
        socket.emit('share_location', {
            "lat": position.coords.latitude,
            "lon": position.coords.longitude
        }, () => {
            $shareLocationButton.removeAttribute('disabled')
            console.log('Location shared')
        })
    })
})

socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error)
        location.href = '/'
    }
})