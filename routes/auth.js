const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator/check');
const config = require('config');
const auth = require('../middleware/auth');
const User = require('../models/User');
const nodemailer = require('nodemailer');

// @route   GET api/auth
// @desc    Get logged in user
// @access  Private
// req is stuff we put in via Postman, the request
router.get('/', auth, async (req, res) => {
  try {
    // finds user by id and doesn't return the password
    console.log('user id is: ');
    console.log(req.user.id);
    const user = await User.findById(req.user.id).select('-password');
    
    // user.notifications.filter((notification) => { //filter out read notifications that are more than 3 days old
    //   notification.isRead == false && notification.dateCreated
    // })
    // returns a user JSON object
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route GET
// @desc Get a password reset email
// @access Public

router.get(`/passwordReset`, async (req, res) => {
  try {
    let transporter = nodemailer.createTransport({
      host: "yourHostHere", //ex: smtp.gmail.com
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: 'yourUserNameHere@email.com', 
        pass: 'yourPasswordHere', 
      },
    });
  
    // send mail with defined transport object
    let info = await transporter.sendMail({
      from: '"AltaVizTest" <yourUserNameHere@email.com>', // sender address
      to: "receipientHere@email.com", // list of receivers
      subject: "Hello ✔", // Subject line
      text: "Hello world?", // plain text body
      html: "<b>Hello world?</b>", // html body
    });
  
    console.log("Message sent: %s", info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
  
    res.json({'msg': 'Email sent.'});
    
  } catch (err) {
    console.error(err);
  }

});

//@route  POST api/auth
//@desc   Auth user & get token
//@access Public
// logs in the user
router.post(
  '/',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists(),
  ],

  async (req, res) => {
    console.log('auth: post request');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // destructures email and password from the request
    const { email, password } = req.body;

    try {
      // checks if user with that email exists
      let user = await User.findOne({ email });

      if (!user) {
        return res.status(401).json({ msg: 'User not found' });
      }
      // checks if the password is correct via bcrypt calling compare with the hashed password and the entered in password
      const isMatch = await bcrypt.compare(password, user.password);

      // returns error message if the password doesn't match
      if (!isMatch) {
        return res.status(401).json({ msg: 'Password not correct' });
      }

      // signing and returning a jwt
      const payload = {
        user: {
          id: user.id,
        },
      };

      //be sure to lower the expiresIn value for production
      jwt.sign(
        payload,
        config.get('jwtSecret'),
        {
          expiresIn: 36000, // 10 hours
        },
        (err, token) => {
          if (err) throw err;
          // returns the jwt
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

module.exports = router;
