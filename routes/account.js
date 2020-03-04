const router = require('express').Router()
const auth = require('./auth')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const Review = mongoose.model('Review')

// GET - Reviews
router.get('/account/reviews/:username', auth.optional, async (req, res, next) => {
  try {
    let [authUser, account] = await Promise.all([
      req.user ? User.findOne({ sub: req.user.sub }) : Promise.resolve(),
      req.params.username ? User.findOne({ username: req.params.username }) : Promise.resolve()
    ])
    if (!account) return res.sendStatus(404)
    
    let reviews = await Review.find({ account: account._id })
      .populate('account', 'username image')
      .populate('tags', 'name')
      .lean()

    return res.json({
      account: account.getUser(authUser),
      reviews: reviews.map(review => {
        return {
          ...review,
          isLiked: authUser.isLiked(review._id),
          isSaved: authUser.isSaved(review.food._id)
        }
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
    let [authUser, account] = await Promise.all([
      req.user ? User.findOne({ sub: req.user.sub }) : Promise.resolve(),
      req.params.username ? User.findOne({ username: req.params.username })
        .populate({ path: 'saved', populate: { path: 'tags', select: 'name' } })
        : Promise.resolve()
    ])
    if (!account) return res.sendStatus(404)

    return res.json({
      account: account.getUser(authUser),
      saved: account.saved.map(food => {
        return {
          ...food,
          isSaved: authUser.isSaved(food._id),
          reviewsCount: food.reviews.length
        }
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
    let [authUser, account] = await Promise.all([
      req.user ? User.findOne({ sub: req.user.sub }) : Promise.resolve(),
      req.params.username ? User.findOne({ username: req.params.username })
        .populate({
          path: 'likes',
          populate: [{ path: 'account', select: 'username image' }, { path: 'tags', select: 'name' }]
        })
        : Promise.resolve()
    ])
    if (!account) return res.sendStatus(404)

    return res.json({
      account: account.getUser(authUser),
      likes: account.likes.map(review => {
        return {
          ...review,
          isLiked: authUser.isLiked(review._id),
          isSaved: authUser.isSaved(review.food._id)
        }
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
    let [authUser, account] = await Promise.all([
      req.user ? User.findOne({ sub: req.user.sub }) : Promise.resolve(),
      req.params.username ? User.findOne({ username: req.params.username })
        .populate('followers', 'username image followersCount')
        : Promise.resolve()
    ])
    if (!account) return res.sendStatus(404)

    return res.json({
      account: account.getUser(authUser),
      followers: account.followers.map(account => {
        return {
          ...account,
          isFollowing: authUser.isFollowing(account._id)
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
    let [authUser, account] = await Promise.all([
      req.user ? User.findOne({ sub: req.user.sub }) : Promise.resolve(),
      req.params.username ? User.findOne({ username: req.params.username })
        .populate('following', 'username image followersCount')
        : Promise.resolve()
    ])
    if (!account) return res.sendStatus(404)

    return res.json({
      account: account.getUser(authUser),
      followers: account.following.map(account => {
        return {
          ...account,
          isFollowing: authUser.isFollowing(account._id)
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
    let query = {}, options = { reviewsCount: -1, followersCount: -1 }
    if (req.query.keywords) {
      query = { $text: { $search: req.query.keywords } }
      options = { score: { $meta: "textScore" } }
    }

    let limit = 12
    let offset = 0
    if (typeof req.query.offset !== 'undefined') offset = req.query.offset
    let authUser = req.user ? await User.findOne({ sub: req.user.sub }) : null
    let users = await User.find(query, options)
      .limit(Number(limit))
      .skip(Number(offset))
      .sort(options)

    return res.json({
      accounts: users.map(function (account) {
        return account.getUser(authUser)
      })
    })

  } catch (err) {
    console.log(err)
    next(err)
  }
})

module.exports = router