const router = require('express').Router()
const auth = require('./auth')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const Food = mongoose.model('Food')
const Tag = mongoose.model('Tag')
const Review = mongoose.model('Review')
const generate = require('nanoid/generate')

// Post Review
router.post('/review', auth.required, async (req, res, next) => {
  try {
    let user = await User.findOne({ sub: req.user.sub })
    if (!user || !req.body.review) return res.sendStatus(401)
    
  } catch (err) {
    console.log(err)
    next(err)
  }
})


module.exports = router
