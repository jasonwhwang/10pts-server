const router = require('express').Router()
const auth = require('./auth')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const generate = require('nanoid/generate')

router.get('/private', auth.required, function (req, res) {
  // console.log(req.user)
  return res.json({ message: 'Private Endpoint: Welcome to 10pts' })
})

// GET/Create - User
// when using auth.required, req.user returns user values:
// 1. req.user.sub - string
// 2. req.user.email - string
// 3. req.user.email_verified - bool
router.get('/user', auth.required, async function (req, res, next) {
  try {
    let user = await User.findOne({ sub: req.user.sub })
      .select('username name image bio reviewsCount saved followersCount following flaggedUsers')
    if (user) return res.json({ user: user.getUser(null) })
    else if (req.user.email_verified === false) return res.sendStatus(401)
    user = new User()
    user.sub = req.user.sub
    user.email = req.user.email
    user.username = req.user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/gi, '')

    let testUser = await User.findOne({ username: user.username }, '_id').lean()
    if(testUser) user.username = user.username + generate('0123456789abcdefghijklmnopqrstuvwxyz', 10)
    
    await user.save()
    return res.json({ user: user.getUser(null) })

  } catch (err) {
    console.log(err)
    next(err)
  }
})

// PUT/Update - User
router.put('/user', auth.required, async (req, res, next) => {
  try {
    let user = await User.findOne({ sub: req.user.sub })
      .select('username name image bio saved followers following flaggedUsers')
    if (!user) { return res.sendStatus(401) }

    let u = req.body.user
    if (typeof u.username !== 'undefined') user.username = u.username.substring(0, 50).toLowerCase().replace(/[^a-z0-9]/gi, '')
    if (typeof u.name !== 'undefined') user.name = u.name.substring(0, 50)
    if (typeof u.image !== 'undefined') user.image = u.image.substring(0, 500)
    if (typeof u.bio !== 'undefined') user.bio = u.bio.substring(0, 500)

    await user.save()
    return res.json({ user: user.getUser(null) })

  } catch (err) {
    console.log(err)
    return next(err)
  }
})

// GET - Notifications
router.get('/user/notifications', auth.required, async function (req, res, next) {
  try {
    let user = await User.findOne({ sub: req.user.sub }, 'notifications')
      .populate({
        path: 'notifications',
        populate: [
          { path: 'review', select: 'foodname foodTitle' },
          { path: 'from', select: 'username image' },
          { path: 'to', select: 'username image' }
        ]
      })
      .lean()
    if (!user) return res.sendStatus(401)
    return res.json({ data: user.notifications })

  } catch (err) {
    console.log(err)
    next(err)
  }
})

module.exports = router