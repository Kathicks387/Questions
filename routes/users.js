const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
let User = require('../models/User');
const bcryptjs = require('bcryptjs');
const gravatar = require('gravatar');
const config = require('config');
const jwt = require('jsonwebtoken');
const authentication = require('../middleware/authentication');

router.get('/', authentication, async(req, res) => {
    try {
       let user = await User.findById(req.user.id).select('-password');
       res.json(user);
    }catch(error) {
        console.error(error.message);
        return res.status(500).send('Server error');
    }
})
router.get('/get_user_by_email/:user_email', async(req, res) => {
    try {
        let userEmail = req.params.user_email;
        let user = await User.findOne({ email: userEmail }).select('-password');
        res.json(user);
    } catch (error){
        console.error(error.message);
        return res.status(500).json('Server Error...');
    }
})

router.get('/users', async(req, res) => {
    try{
        let users = await User.find().select('-password');
       res.json(users); 
    }catch(error) {
        console.error(error.message);
        return res.status(500).send('Server error');
    }
})

router.get('/get_user_by_id/:user_id', async(req, res) => {
    try{
        let userId = req.params.user_id;
        let user = await User.findById(userId).select('-password');
       res.json(user); 
    }catch(error) {
        console.error(error.message);
        return res.status(500).send('Server error');
    }
})
router.post('/register', 
[
    check('firstName', 'First name is needed').not().isEmpty(),
    check('lastName', 'Last name is needed').not().isEmpty(),
    check('email', 'Email address is needed').isEmail(),
    check('userName', 'Please create a username').not().isEmpty(), 
    check('password', 'Password must contain at least 6 characters and no more than 12').isLength({min: 6, max:12})
],


 async (req, res) =>{
  try {
       let  { firstName,lastName,email,userName,password } = req.body;
       let user = await User.findOne({ email }).select('-password');
       let fetchedUserNameFromDatabase = await User.findOne({ userName }).select('-password');
       let errors = validationResult(req); 
       if(!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
       
       if(user) return res.status(401).send('Email address has already been created');
       
       if(fetchedUserNameFromDatabase) return res.status(401).send('Username has already been taken');
    
       const avatar = gravatar.url(email,{
           r: 'pg',
           d: 'mm',
           s: '200'
       })

       let newUser = new User ({
           firstName,
           lastName,
           email,
           userName,
           password,
           avatar
       });

       const salt = await bcryptjs.genSalt(10);

       let hashedPassword = await bcryptjs.hash(password, salt);
       
       newUser.password = hashedPassword;

    await newUser.save();

    const payload = {
        user: {
            id: newUser._id,
        },
    };
    jwt.sign(
        payload,
        config.get('jsonWebTokenSecret'), 
        { expiresIn: 5900}, 
        (err, token) => {
            if(err) throw err;
            res.json({ token });
        }
        );

   
  } catch (error) {
       console.error(error.message);
            return res.status(500).send('Server error');
  }
});

router.post('/login', 
[
    check('email', 'Email address is needed').isEmail(),
    check('password', 'Password must contain at least 6 characters and no more than 12').isLength({min: 6, max:12})
],

async (req, res) =>{
  try {
       let  { email, password } = req.body;
       let user = await User.findOne({ email });
       let errors = validationResult(req); 
       
       if(!errors.isEmpty()) {
         return res.status(400).json({ errors: errors.array() });
       };

       
       if(!user) { return res
       .status(404)
       .send("User with this email address hasn't been created yet");
       }; 

    let doPasswordsMatch = await bcryptjs.compare(password, user.password);

    if(!doPasswordsMatch) return res.status(401).json('Passwords do not match!');  
    

    const payload = {
        user: {
            id: user._id,
        },
    };
    jwt.sign(
        payload,
        config.get('jsonWebTokenSecret'), 
        { expiresIn: 5900}, 
        (err, token) => {
            if(err) throw err;
            res.json({ token });
        }
        );
  } catch (error) {
       console.error(error.message);
            return res.status(500).send('Server error');
  }
});

router.put("/search_by_username", [check('userNameFromSearch', 'Search is empty').not().isEmpty()], async (req, res) => {
        try {
            let { userNameFromSearch } = req.body;
            let errors = validationResult(req);
            if (!errors.isEmpty()){
                return res.status(400).json({ errors: errors.array() });
            };
            let users = await User.find().select('-password');
            let findUserByUsername = users.filter((user) =>
             user.userName.toString().toLowerCase().split(" ").join("") === 
             userNameFromSearch.toString().toLowerCase().split(" ").join(""));
            res.json(findUserByUsername);
        
        } catch (error) {
        console.error(error.message);
            return res.status(500).json("Server error");
        
        }
    });

router.put(
    '/change_user_data/:user_data_to_change', 
    authentication, 
    [
       check('changeUserData', 'Input is empty').not().isEmpty()
    ], 
    async(req, res) => {
    try {
       const { changeUserData } = req.body;
       let user = await User.findById(req.user.id).select('-password');
       let errors = validationResult(req);
       if(!errors.isEmpty()) {
         return res.status(400).json({ errors: errors.array() });
       };
       if(!user) return res.status(404).json('User not found');

       let userDataToChange = req.params.user_data_to_change.toString();

       if(user[userDataToChange] === changeUserData.toString()) {
           return res.status(401).json('This is the same information we already have stored');
       }
       user[userDataToChange] = changeUserData.toString();

       await user.save();

       res.json('Data is changed');

    }catch (error) {
        console.error(error.message);
        return res.status(500).json('Server Error');
    }
}
);

router.put(
    '/check_actual_password', 
    authentication, 
[check(
    'passwordCheck', 
    'Password has to be between 6 to 12 characters'
    ).isLength({
        min: 6,
        max: 12,})
    ], 
    async(req, res)=>{
        try {
            let { passwordCheck } = req.body;
            const errors = validationResult(req);
            if (!errors.isEmpty())
                    return res.status(400).json({ errors: errors.array() });
                
            let user = await User.findById(req.user.id);
            
            let passwordsMatch = await bcryptjs.compare( passwordCheck, user.password);
            
            if(!passwordsMatch)
                return res.status(401).json('Password does not match');
            res.json('Success!');
            
        } catch (error) {
            console.error(error.message);
                return res.status(500).json("Server error");
        }
    });

router.put(
    '/change_user_password',
    authentication,
    [
        check('newPassword', 'New password must contain at least 6 characters and no more than 12').isLength({min: 6, max:12})
    ],
    async(req, res) =>{
        try {
            const { newPassword } = req.body;
            const errors = validationResult(req);
            if (!errors.isEmpty())
            return res.status(400).json({ errors: errors.array() });
            let user = await User.findById(req.user.id);

            const salt = await bcryptjs.genSalt(10);

            const hashedPassword = await bcryptjs.hash(newPassword, salt);

            user.password = hashedPassword;

            await user.save();

            res.json('Success!');

        } catch (error) {
            console.error(error);
            return res.status(500).json('Server Error');
        }
    }
)


module.exports = router;