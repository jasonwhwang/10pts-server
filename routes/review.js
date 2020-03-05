const router = require('express').Router()
const auth = require('./auth')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const Food = mongoose.model('Food')
const Review = mongoose.model('Review')
import { createNotification } from './notification'

// GET - Get Review
router.get('/review/:foodname', auth.optional, async (req, res, next) => {
  try {
    let [user, review] = await Promise.all([
      User.findOne({ sub: req.user.sub }),
      Review.findOne({ foodname: req.params.foodname })
        .populate('account', 'username image')
        .populate('tags', 'name')
        .populate('comments')
    ])
    if(!user || !review) return res.sendStatus(401)
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
    if (!user || !req.body.review) return res.sendStatus(401)

    let r = req.body.review
    let review = await Review.findOne({ account: user._id, foodTitle: r.foodTitle, address: r.address })
      .select('-comments -likesCount -flaggedCount')
    if (review || r._id) throw new Error('Review already exists.')
    if (!r.foodTitle || !r.address || !r.photos || !r.tags
      || !r.review || !r.price || !r.pts) throw new Error('Missing values.')

    review = new Review()
    review.setFood(r.foodTitle, r.address)
    review.account = user._id
    review.setDetails(r)
    await review.setTags(r.tags)

    // Update Food
    let food = await Food.findOne({ foodTitle: r.foodTitle, address: r.address })
    if (!food) {
      let food = new Food()
      food.setFood(r.foodTitle, r.address)
    }
    food.setDetails(review, null)

    // save both review and food
    review.food = food._id
    await Promise.all([review.save(), food.save()])

    res.json({ review: review.getReview(user) })

    // Create notifications
    user.followers.forEach(async followerId => {
      await createNotification('review', review._id, user._id, followerId)
    })

    return

  } catch (err) {
    console.log(err)
    next(err)
  }
})


// PUT - Update Review
router.post('/review/:foodname', auth.required, async (req, res, next) => {
  try {
    let user = await User.findOne({ sub: req.user.sub })
    if (!user || !req.body.review
      || req.body.review.foodname !== req.params.foodname) return res.sendStatus(401)

    let r = req.body.review
    let review = await Review.findOne({ account: user._id, foodname: req.params.foodname })
      .select('-comments -likesCount -flaggedCount')
    if (!review) return res.sendStatus(404)
    if (!r.foodTitle || !r.address || !r.photos || !r.tags
      || !r.review || !r.price || !r.pts) throw new Error('Missing values.')

    let oldReview = review.getDetails()
    review.setDetails(r)
    await review.setTags(r.tags)

    // Update Food
    let food = await Food.findById(review.food)
    if (food.foodTitle === r.foodTitle && food.address === r.address) {
      await food.setDetails(review, oldReview)
    } else {
      // remove review from old food
      food.removeReview(review)
      if (food.reviews.length <= 0) await Food.findByIdAndDelete(food._id)
      else await food.save()

      // find food using foodTitle and address
      food = await Food.findOne({ foodTitle: r.foodTitle, address: r.address })
      // if found, add review to found food
      if (food) food.setDetails(review, null)
    }

    if (!food) {
      let food = new Food()
      food.setFood(r.foodTitle, r.address)
      food.setDetails(review, null)
    }

    // save both review and food
    await Promise.all([review.save(), food.save()])
    return res.json({ review: review.getReview(user) })

  } catch (err) {
    console.log(err)
    next(err)
  }
})


// DELETE - Delete Review
router.delete('/review/:foodname', auth.required, async (req, res, next) => {
  try {
    let user = await User.findOne({ sub: req.user.sub })
    if (!user || !req.body.review
      || req.body.review.foodname !== req.params.foodname) return res.sendStatus(401)

    let review = await Review.findOne({ account: user._id, foodname: req.params.foodname })
    if (!review) return res.sendStatus(404)

    await Promise.all([review.setTags([]), review.deleteComments()])

    // Update Food
    let food = await Food.findById(review.food)
    if (food) {
      food.removeReview(review)
      if (food.reviews.length <= 0) await Food.findByIdAndDelete(food._id)
      else await food.save()
    }

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
    let query = {}, options = {}
    if (req.query.keywords) {
      query = { $text: { $search: req.query.keywords } }
      options = { score: { $meta: "textScore" } }
    }

    let limit = 12
    let offset = 0
    if (typeof req.query.offset !== 'undefined') offset = req.query.offset
    let user = req.user ? await User.findOne({ sub: req.user.sub }) : null
    let reviews = await Review.find(query, options)
      .limit(Number(limit))
      .skip(Number(offset))
      .sort(options)

    return res.json({
      reviews: reviews.map(function (review) {
        return review.getReviewBasic(user)
      })
    })

  } catch (err) {
    console.log(err)
    next(err)
  }
})


// Like
router.put('/review/like/:reviewId', auth.required, async (req, res, next) => {
  try {
    let [user, review] = await Promise.all([
      User.findOne({ sub: req.user.sub }),
      Review.findById(req.params.reviewId)
    ])
    if (!user || !review) return res.sendStatus(401)
    await user.like(review)
    return res.json({ isLiked: user.isLiked(review._id), likesCount: review.likesCount })

  } catch (err) {
    console.log(err)
    next(err)
  }
})

// Unlike
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

module.exports = router
