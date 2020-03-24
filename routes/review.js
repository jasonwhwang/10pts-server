const router = require('express').Router()
const auth = require('./auth')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const Food = mongoose.model('Food')
const Review = mongoose.model('Review')
const Notification = require('./notification')

// GET - Get Review
router.get('/review/:foodname/:username', auth.optional, async (req, res, next) => {
  try {
    let [user, account] = await Promise.all([
      req.user ? User.findOne({ sub: req.user.sub }) : Promise.resolve(),
      User.findOne({ username: req.params.username })
    ])
    if (!account) return res.sendStatus(401)

    let review = await Review.findOne({ account: account._id, foodname: req.params.foodname })
      .populate('account', 'username image')
      .populate('tags', 'name')
      .populate({
        path: 'comments',
        populate: { path: 'account', select: 'username image' }
      })
    if (!review) return res.sendStatus(404)
    return res.json({ review: review.getReview(user) })

  } catch (err) {
    console.log(err)
    next(err)
  }
})

// POST - New Review
router.post('/review', auth.required, async (req, res, next) => {
  try {
    let user = await User.findOne({ sub: req.user.sub })
    let r = req.body.review
    if (!user || !r) return res.sendStatus(401)

    let review = await Review.findOne({ account: user._id, foodTitle: r.foodTitle, address: r.address })
      .select('-comments -likesCount -flaggedCount')
    if (review || r._id) return res.status(403).send({ error: 'Review already exists.' })

    // Get Food
    let food = await Food.findOne({ foodTitle: r.foodTitle, address: r.address })
    if (!food) {
      food = new Food()
      food.setFood(r.foodTitle, r.address)
    }
    // Create Review
    review = new Review()
    review.setFood(food.foodname, r.foodTitle, r.address, user._id, food._id)
    review.setDetails(r)
    await review.save()
    await review.setTags(r.tags)
    // Update Food
    food.setDetails(review, null)
    // Update User reviews count
    user.reviewsCount = user.reviewsCount + 1
    await Promise.all([review.save(), food.save(), user.save()])

    res.json({ review: { foodname: review.foodname } })

    // Create notifications
    user.followers.forEach(followerId => {
      Notification.create('review', review._id, user._id, followerId)
    })

    return

  } catch (err) {
    console.log(err)
    next(err)
  }
})


// PUT - Update Review
router.put('/review/:reviewId', auth.required, async (req, res, next) => {
  try {
    let user = await User.findOne({ sub: req.user.sub })
    let r = req.body.review
    if (!user || !r || r._id !== req.params.reviewId) return res.sendStatus(401)

    let review = await Review.findById(req.params.reviewId, '-comments -likesCount -flaggedCount')
    if (!review) return res.sendStatus(404)

    let oldReview = review.getDetails()
    // Get Food
    let food = await Food.findById(review.food)
    if(food) {
      // if food is different
      if(food.foodTitle !== r.foodTitle || food.address !== r.address) {
        // remove review from old food
        food.removeReview(review)
        if (food.reviews.length <= 0) await Food.findByIdAndDelete(food._id)
        else await food.save()
        // find food using new foodTitle and new address
        food = await Food.findOne({ foodTitle: r.foodTitle, address: r.address })
        if(food) {
          review.setFood(food.foodname, r.foodTitle, r.address, user._id, food._id)
          oldReview = null
        }
      }
    }
    if (!food) {
      food = new Food()
      food.setFood(r.foodTitle, r.address)
      review.setFood(food.foodname, r.foodTitle, r.address, user._id, food._id)
    }
    // Update Review
    review.setDetails(r)
    await review.setTags(r.tags)
    // Update Food
    food.setDetails(review, oldReview)

    // save both review and food
    await Promise.all([review.save(), food.save()])
    return res.json({ review: { foodname: review.foodname } })

  } catch (err) {
    console.log(err)
    next(err)
  }
})


// DELETE - Delete Review
router.delete('/review/:reviewId', auth.required, async (req, res, next) => {
  try {
    let user = await User.findOne({ sub: req.user.sub })
    if (!user || !req.params.reviewId) return res.sendStatus(401)

    let review = await Review.findById(req.params.reviewId)
    if (!review) return res.sendStatus(404)

    await Promise.all([review.setTags([]), review.deleteComments()])

    // Update Food
    let food = await Food.findById(review.food)
    if (food) {
      food.removeReview(review)
      if (food.reviews.length <= 0) await Food.findByIdAndDelete(food._id)
      else await food.save()
    }

    // Update User reviews count
    user.reviewsCount = user.reviewsCount - 1
    await user.save()

    await Review.findByIdAndDelete(review._id)
    return res.json({ review: {} })

  } catch (err) {
    console.log(err)
    next(err)
  }
})


// GET - All Current Reviews
router.get('/reviews', auth.optional, async (req, res, next) => {
  try {
    let query = {}, options = {}, sortOptions = {}
    if (req.query.keywords) {
      query = { $text: { $search: req.query.keywords } }
      options = { score: { $meta: "textScore" } }
      sortOptions = { score: { $meta: "textScore" } }
    }
    if (req.query.date) {
      let createdAt = { createdAt: { $lte: new Date(parseInt(req.query.date)) } }
      query = { ...query, ...createdAt }
      sortOptions.createdAt = -1
    }

    let limit = 12
    let offset = 0
    if (typeof req.query.limit !== 'undefined') limit = req.query.limit
    if (typeof req.query.offset !== 'undefined') offset = req.query.offset
    let user = req.user ? await User.findOne({ sub: req.user.sub }) : null
    let reviews = await Review.find(query, options)
      .populate('account', 'username image')
      .limit(Number(limit))
      .skip(Number(offset*limit))
      .sort(sortOptions)

    return res.json({
      data: reviews.map(function (review) {
        return review.getReviewBasic(user)
      })
    })

  } catch (err) {
    console.log(err)
    next(err)
  }
})


// PUT - Like Review
router.put('/review/like/:reviewId', auth.required, async (req, res, next) => {
  try {
    let [user, review] = await Promise.all([
      User.findOne({ sub: req.user.sub }),
      Review.findById(req.params.reviewId)
    ])
    if (!user || !review) return res.sendStatus(401)
    if (user._id.toString() === review.account.toString()) return res.sendStatus(422)
    await user.like(review)
    await Notification.create('like', review._id, user._id, review.account)
    return res.json({ isLiked: user.isLiked(review._id), likesCount: review.likesCount })

  } catch (err) {
    console.log(err)
    next(err)
  }
})

// PUT - Unlike Review
router.put('/review/unlike/:reviewId', auth.required, async (req, res, next) => {
  try {
    let [user, review] = await Promise.all([
      User.findOne({ sub: req.user.sub }),
      Review.findById(req.params.reviewId)
    ])
    if (!user || !review) return res.sendStatus(401)
    await user.unlike(review)
    return res.json({ isLiked: user.isLiked(review._id), likesCount: review.likesCount })

  } catch (err) {
    console.log(err)
    next(err)
  }
})

// PUT - Flag Review
router.put('/review/flag/:reviewId', auth.required, async (req, res, next) => {
  try {
    let [user, review] = await Promise.all([
      User.findOne({ sub: req.user.sub }),
      Review.findById(req.params.reviewId)
    ])
    if (!user || !review) return res.sendStatus(401)
    if (user._id.toString() === review.account.toString()) return res.sendStatus(422)
    await user.flagReview(review)
    return res.json({ isFlagged: user.isFlaggedReview(review._id) })

  } catch (err) {
    console.log(err)
    next(err)
  }
})

// PUT - Unflag Review
router.put('/review/unflag/:reviewId', auth.required, async (req, res, next) => {
  try {
    let [user, review] = await Promise.all([
      User.findOne({ sub: req.user.sub }),
      Review.findById(req.params.reviewId)
    ])
    if (!user || !review) return res.sendStatus(401)
    if (user._id.toString() === review.account.toString()) return res.sendStatus(422)
    await user.unflagReview(review)
    return res.json({ isFlagged: user.isFlaggedReview(review._id) })

  } catch (err) {
    console.log(err)
    next(err)
  }
})

module.exports = router
