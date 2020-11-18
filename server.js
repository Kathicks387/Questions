const express = require('express');
const app = express();
const connectToDatabase = require('./config/connectToDatabase');
const cors = require('cors');

//connects express app to database
connectToDatabase();

// prevent from cors policy warning
app.use(cors());

//allows us to use body json thing to create posts
app.use(express.json({extended: false}));

//Routes
app.use('/api/posts', require('./routes/posts.js'));
app.use('/api/users', require('./routes/users.js'));

//specify port if heroku doesn't have a specific port to use
let PORT = process.env.PORT || 3012;

//specifies which port we want our app to be with for callback function to check to see if the port is working
app.listen(PORT, () => console.log(`You  know what it is!!: ${PORT}`));