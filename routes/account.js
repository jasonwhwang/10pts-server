const router = require('express').Router()
const auth = require('./auth')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const Review = mongoose.model('Review')
const Notification = require('./notification')

// GET - Account Reviews
router.get('/account/reviews/:username', auth.optional, async (req, res, next) => {
  try {
    let [user, account] = await Promise.all([
      req.user ? User.findOne({ sub: req.user.sub }) : Promise.resolve(),
      req.params.username ? User.findOne({ username: req.params.username }) : Promise.resolve()
    ])
    if (!account) return res.sendStatus(404)

    let reviews = await Review.find({ account: account._id }, '-tags -comments')
      .populate('account', 'username image')

    return res.json({
      account: account.getUser(user),
      data: reviews.map(review => {
        return review.getReviewBasic(user)
      })
    })

  } catch (err) {
    console.log(err)
    next(err)
  }
})

// GET - Saved
router.get('/account/saved/:username', auth.optional, async (req, res, next) => {
  try {
    let [user, account] = await Promise.all([
      req.user ? User.findOne({ sub: req.user.sub }) : Promise.resolve(),
      req.params.username ? User.findOne({ username: req.params.username })
        .populate('saved', '-tags')
        : Promise.resolve()
    ])
    if (!account) return res.sendStatus(404)

    return res.json({
      account: account.getUser(user),
      data: account.saved.map(food => {
        return food.getFood(user)
      })
    })

  } catch (err) {
    console.log(err)
    next(err)
  }
})


// GET - Likes
router.get('/account/likes/:username', auth.optional, async (req, res, next) => {
  try {
    let [user, account] = await Promise.all([
      req.user ? User.findOne({ sub: req.user.sub }) : Promise.resolve(),
      req.params.username ? User.findOne({ username: req.params.username })
        .populate({
          path: 'likes', select: '-tags -comments',
          populate: [{ path: 'account', select: 'username image' }]
        })
        : Promise.resolve()
    ])
    if (!account) return res.sendStatus(404)

    return res.json({
      account: account.getUser(user),
      data: account.likes.map(review => {
        return review.getReviewBasic(user)
      })
    })

  } catch (err) {
    console.log(err)
    next(err)
  }
})


// GET - Followers
router.get('/account/followers/:username', auth.optional, async (req, res, next) => {
  try {
    let [user, account] = await Promise.all([
      req.user ? User.findOne({ sub: req.user.sub }) : Promise.resolve(),
      req.params.username ? User.findOne({ username: req.params.username })
        .populate('followers', 'username image reviewsCount followersCount', null, { sort: { reviewsCount: -1, followersCount: -1 } })
        : Promise.resolve()
    ])
    if (!account) return res.sendStatus(404)

    return res.json({
      account: account.getUser(user),
      data: account.followers.map(account => {
        return {
          ...account.toObject(),
          isFollowing: user.isFollowing(account._id)
        }
      })
    })

  } catch (err) {
    console.log(err)
    next(err)
  }
})


// GET - Following
router.get('/account/following/:username', auth.optional, async (req, res, next) => {
  try {
    let [user, account] = await Promise.all([
      req.user ? User.findOne({ sub: req.user.sub }) : Promise.resolve(),
      req.params.username ? User.findOne({ username: req.params.username })
        .populate('following', 'username image reviewsCount followersCount', null, { sort: { reviewsCount: -1, followersCount: -1 } })
        : Promise.resolve()
    ])
    if (!account) return res.sendStatus(404)

    return res.json({
      account: account.getUser(user),
      data: account.following.map(account => {
        return {
          ...account.toObject(),
          isFollowing: user.isFollowing(account._id)
        }
      })
    })

  } catch (err) {
    console.log(err)
    next(err)
  }
})


// GET - Accounts Search Query
router.get('/accounts', auth.optional, async (req, res, next) => {
  try {
    let query = {}, options = {}, sortOptions = { reviewsCount: -1, followersCount: -1 }
    if (req.query.keywords) {
      // query = { $text: { $search: req.query.keywords } }
      options = { score: { $meta: "textScore" } }
      query = {
        $or: [
          { name: { $regex: req.query.keywords, $options: "i" } },
          { username: { $regex: req.query.keywords, $options: "i" } },
          { $text: { $search: req.query.keywords } }
        ]
      }
      sortOptions = { ...sortOptions, ...options }
    }

    let limit = 12
    let offset = 0
    if (typeof req.query.offset !== 'undefined') offset = req.query.offset
    let user = req.user ? await User.findOne({ sub: req.user.sub }) : null
    let accounts = await User.find(query, options)
      .limit(Number(limit))
      .skip(Number(offset))
      .sort(sortOptions)

    return res.json({
      data: accounts.map(function (account) {
        return account.getUser(user)
      })
    })

  } catch (err) {
    console.log(err)
    next(err)
  }
})


// PUT - Follow
router.put('/account/follow/:username', auth.required, async (req, res, next) => {
  try {
    let [user, account] = await Promise.all([
      User.findOne({ sub: req.user.sub }),
      User.findOne({ username: req.params.username })
    ])
    if (user._id.toString() === account._id.toString()) return res.sendStatus(422)
    await user.follow(account)
    await Notification.create('follow', null, user._id, account._id)
    return res.json({ isFollowing: user.isFollowing(account._id), followersCount: account.followersCount })

  } catch (err) {
    console.log(err)
    next(err)
  }
})

// PUT - Unfollow
router.put('/account/unfollow/:username', auth.required, async (req, res, next) => {
  try {
    let [user, account] = await Promise.all([
      User.findOne({ sub: req.user.sub }),
      User.findOne({ username: req.params.username })
    ])
    await user.unfollow(account)
    return res.json({ isFollowing: user.isFollowing(account._id), followersCount: account.followersCount })

  } catch (err) {
    console.log(err)
    next(err)
  }
})

// PUT - Flag Account
router.put('/account/flag/:username', auth.required, async (req, res, next) => {
  try {
    let [user, account] = await Promise.all([
      User.findOne({ sub: req.user.sub }),
      User.findOne({ username: req.params.username })
    ])
    if (user._id.toString() === account._id.toString()) return res.sendStatus(422)
    await user.flagUser(account)
    return res.json({ isFlagged: user.isFlaggedUser(account._id) })

  } catch (err) {
    console.log(err)
    next(err)
  }
})

// PUT - Flag Account
router.put('/account/unflag/:username', auth.required, async (req, res, next) => {
  try {
    let [user, account] = await Promise.all([
      User.findOne({ sub: req.user.sub }),
      User.findOne({ username: req.params.username })
    ])
    if (user._id.toString() === account._id.toString()) return res.sendStatus(422)
    await user.unflagUser(account)
    return res.json({ isFlagged: user.isFlaggedUser(account._id) })

  } catch (err) {
    console.log(err)
    next(err)
  }
})

module.exports = router