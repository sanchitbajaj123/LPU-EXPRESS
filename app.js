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
const { log } = require('console');
const { type } = require('os');
let rn=0
let mb=0
let img="null"

const connectDB = async () => {
    try {
        await mongoose.connect("mongodb://localhost:27017/backendproject");
        console.log("Connected to Mongo DB");
        counter=0
    } catch (error) {
        console.log(error.message);
    }
}
connectDB()

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

const customerschema = new mongoose.Schema({
    parcelname: {
        type: String,
    },
    registrationNumber: {
        type: String
    },
    idCardImage: {
        type: String
    },
    phoneNumber: {
        type: String
    },
    location:{
        type:String
    }
    ,fare:{
        type:Number
    },company:{
        type:String
    },
    deliveryregistrationNumber: {
        type: String,
        default: null 
    }
}, { collection: 'customers' });

const io = soc(server);
app.use(exp.json());
app.use(exp.static(path.join(__dirname, 'public')));
app.use('/img', exp.static(path.join(__dirname, 'img')));
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
app.get('/choose',(req,res)=>{
    res.sendFile(path.join(__dirname, 'index.html'))

})
app.get('/customerform',(req,res)=>{
    res.sendFile(path.join(__dirname,'customer form.html'))
})
app.get('/customer-list',(req,res)=>{
res.sendFile(path.join(__dirname,'custmlist.html'))
})
app.get('/viewservices',(req,res)=>{

    res.sendFile(path.join(__dirname,'viewservices.html'))    
    
})
app.get('/deliverypersonshow',(req,res)=>{

    res.sendFile(path.join(__dirname,'deliverypersonshow.html')) 
    
})

io.on('connection', (socket) => {
    console.log(rn)
    console.log('New client connected');

    socket.on('fetchcounter',()=>{
        console.log("counter:")
        socket.emit('gotcounter',counter)
        console.log(counter)
    })
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
           
            await user.save();
            console.log("User added to database");
            socket.emit("signsuccess")
        } catch (error) {
            console.error("Error saving user:", error);
        }}
    });
    
    socket.on('login', async (formData) => {
        console.log('Received form data:', formData);
        const {registrationNumber,password } = formData;
        rn=registrationNumber
        const User = mongoose.model('user', UserSchema);
        const existingUser = await User.findOne({ registrationNumber });
        if(existingUser){
            if (password === existingUser.password){
                mb=existingUser.phoneNumber
                img=existingUser.idCardImage
                socket.emit("success",counter)
            }
            else{
                socket.emit("fail")
            }
        }
        else{
            socket.emit("fail")
        }
    });
    socket.on('passrn',()=>{
        socket.emit('fetchrn',rn)
    })
    socket.on('sendrn',(recdata)=>{
        rn=recdata
    })
    
    socket.on('custmform', async (form,recdata) => {
        console.log('Received form data:', form);
        const { name, company, fare, location} = form;
        const registrationNumber=recdata
        const Use = mongoose.model('user', UserSchema);
        const use = await Use.findOne({ registrationNumber: recdata});
        console.log(use)
        console.log(use.phoneNumber)
        const phoneNumber=use.phoneNumber
        const parcelname=name
        const idCardImage=use.idCardImage
        const User = mongoose.model('customers', customerschema);
        
        const user = new User({ parcelname,registrationNumber,idCardImage, phoneNumber,location,fare,company });

        try {
           
            await user.save();
            console.log("cust added to database");
            
        } catch (error) {
            console.error("Error saving user:", error);
        }
    
    })

    socket.on('custmlistfetch', async () => {
        try {
            const Customer = mongoose.model('customers', customerschema);
            const customers = await Customer.find({}).exec();
            console.log(customers)
            socket.emit('custmlistshow', customers);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    });
    socket.on('accepted',async(acceptedData)=>{
        const Customer = mongoose.model('customers', customerschema);
        const customer = await Customer.findOne({ registrationNumber: acceptedData.registrationNumber });
        customer.deliveryregistrationNumber = rn;
        await customer.save();

    })
    socket.on('fetchviewservices',async(recdata)=>{
        rn=recdata
        const Customer = mongoose.model('customers', customerschema);
        console.log(rn)
        const customer = await Customer.find({ deliveryregistrationNumber: rn });
        console.log(customer)
        socket.emit('showviewservices',customer,rn)

    })
    socket.on('delivered', async (registrationNumber) => {
        try {
            const Customer = mongoose.model('customers', customerschema);
            // Find the document with the specified registration number and delete it
            const result = await Customer.deleteOne({ registrationNumber: registrationNumber });
            if (result.deletedCount === 1) {
                console.log(`Document with registration number ${registrationNumber} deleted successfully.`);
            } else {
                console.log(`Document with registration number ${registrationNumber} not found.`);
            }
        } catch (error) {
            console.error('Error deleting document:', error);
        }
    });
    socket.on('fetchdeliverydetails',async(recdata)=>{
        
            const Customer = mongoose.model('customers', customerschema);
            const customer = await Customer.findOne({ registrationNumber: recdata });
            console.log(customer)
            socket.emit('deliverydetails',customer)
        })
    

    socket.on('disconnect', () => {
        counter=0;
        console.log('Client disconnected');
    });
});


