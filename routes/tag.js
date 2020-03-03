const router = require('express').Router()
const auth = require('./auth')
const mongoose = require('mongoose')
const Tag = mongoose.model('Tag')

router.get('/tags', auth.optional, async (req, res, next) => {
  try {
    let tags = await Tag.find({}).lean()
    return res.json({ tags: tags })
  } catch(err) {
    console.log(err)
    next(err)
  }
})

module.exports = router