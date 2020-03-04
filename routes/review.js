const router = require('express').Router()
const auth = require('./auth')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const Food = mongoose.model('Food')
const Tag = mongoose.model('Tag')
const Review = mongoose.model('Review')

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
    return res.json({ review: review })

  } catch (err) {
    console.log(err)
    next(err)
  }
})


// PUT - Update Review
router.post('/review', auth.required, async (req, res, next) => {
  try {
    let user = await User.findOne({ sub: req.user.sub })
    if (!user || !req.body.review) return res.sendStatus(401)

    let r = req.body.review
    let review = await Review.findById(r._id)
      .select('-comments -likesCount -flaggedCount')
    if (!review) throw new Error('Review does not exist.')
    if (!r.foodTitle || !r.address || !r.photos || !r.tags
      || !r.review || !r.price || !r.pts) throw new Error('Missing values.')

    let oldReview = review.getDetails()
    review.setDetails(r)
    await review.setTags(r.tags)

    // Update Food
    let food = await Food.findById(review.food)
    if (food.foodTitle !== r.foodTitle || food.address !== r.address) {
      // remove review from old food
      food.removeReview(review)
      if (food.reviews.length <= 0) await Food.findByIdAndDelete(food._id)
      else await food.save()

      // find food using foodTitle and address
      food = await Food.findOne({ foodTitle: r.foodTitle, address: r.address })
      // if found, add review to found food
      if (food) food.setDetails(review, null)
    } else {
      await food.setDetails(review, oldReview)
    }

    if (!food) {
      let food = new Food()
      food.setFood(r.foodTitle, r.address)
      food.setDetails(review, null)
    }

    // save both review and food
    await Promise.all([review.save(), food.save()])
    return res.json({ review: review })

  } catch (err) {
    console.log(err)
    next(err)
  }
})


// DELETE - Delete Review
router.delete('/review', auth.required, async (req, res, next) => {
  try {
    let user = await User.findOne({ sub: req.user.sub })
    if (!user || !req.body.review) return res.sendStatus(401)

    let r = req.body.review
    let review = await Review.findById(r._id)
      .select('-comments -likesCount -flaggedCount')
    if (!review) throw new Error('Review does not exist.')

    await Promise.all([review.setTags([]), review.deleteComments()])

    // Update Food
    let food = await Food.findById(review.food)
    if (food) {
      food.removeReview(review)
      if (food.reviews.length <= 0) await Food.findByIdAndDelete(food._id)
      else await food.save()
    }

    await review.save()
    return res.json({ review: {} })

  } catch (err) {
    console.log(err)
    next(err)
  }
})


module.exports = router
