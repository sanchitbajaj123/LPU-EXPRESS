const exp = require('express');
const soc = require('socket.io');
const path = require('path');
const fs = require('fs');
const app = exp();
const hostname = '0.0.0.0';
const multer = require('multer');
const server = app.listen(process.env.PORT || 3000, hostname, () => {
    console.log("listening");
});
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect("mongodb://localhost:27017/backendproject");
        console.log("Connected to Mongo DB");
    } catch (error) {
        console.log(error.message);
    }
}

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String
    },
    registrationNumber: {
        type: String
    },
    idCardImage: {
        type: String
    },
    phoneNumber: {
        type: String
    }
}, { collection: 'user' });

const io = soc(server);
app.use(exp.json());
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'signup.html'));
});
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

 var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads');
    },
    filename: function (req, file, cb) {
        cb(null, new Date().toDateString() + ".png")
    },
});



io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('signup', async (formData) => {
        console.log('Received form data:', formData);
        const { name, email, password, registrationNumber, idCardImage, phoneNumber } = formData;
        const User = mongoose.model('user', UserSchema);
        const existingUser = await User.findOne({ registrationNumber });
        if(existingUser){
          socket.emit('exist')
          console.log("already exists")

        }else{
        
        // Save id card image
        var upload = multer({
          storage: storage,
      }).single(idCardImage);
        
        // Create new user document
        const User = mongoose.model('user', UserSchema);
        const user = new User({ name, email, password, registrationNumber, idCardImage, phoneNumber });

        try {
            // Save user to database
            await user.save();
            console.log("User added to database");
        } catch (error) {
            console.error("Error saving user:", error);
        }}
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

connectDB();
