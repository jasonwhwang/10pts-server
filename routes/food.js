const router = require('express').Router()
const auth = require('./auth')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const Food = mongoose.model('Food')

// GET - Get Food
router.get('/food/:foodname', auth.optional, async (req, res, next) => {
  try {
    let [user, food] = await Promise.all([
      User.findOne({ sub: req.user.sub }),
      Food.findOne({ foodname: req.params.foodname })
        .populate('account', 'username image')
        .populate('tags', 'name')
        .populate('comments')
    ])
    if (!user || !food) return res.sendStatus(401)
    return res.json({ food: food.getFood(user) })

  } catch (err) {
    console.log(err)
    next(err)
  }
})


// GET - All Current Food
router.get('/food', auth.optional, async (req, res, next) => {
  try {
    let q = req.query, query = {}, options = {}
    if (q.keywords) {
      query = { $text: { $search: q.keywords } }
      options = { score: { $meta: "textScore" } }
    }

    let tags = q.tags
    console.log(tags)
    // https://stackoverflow.com/a/60534727/9857121
    // Convert tags array to ObjectId array
    // tags = tags.map(tag => return mongoose.Types.ObjectId(tag))
    // query.tags = { $all: tags }

    let minPts = {}, maxPts = {}, minPrice = {}, maxPrice = {}
    if (q.minPts) minPts = { $gte: q.minPts }
    if (q.maxPts) maxPts = { $lte: q.maxPts }
    if (q.minPrice) minPrice = { $gte: q.minPrice }
    if (q.maxPrice && q.maxPrice < 100) maxPrice = { $lte: q.maxPrice }
    query.pts = { ...minPts, ...maxPts }
    query.price = { ...minPrice, ...maxPrice }

    let limit = 12
    let offset = 0
    if (typeof q.offset !== 'undefined') offset = q.offset
    let user = req.user ? await User.findOne({ sub: req.user.sub }) : null
    let allFood = await Food.find(query, options)
      .limit(Number(limit))
      .skip(Number(offset))
      .sort(options)

    return res.json({
      data: allFood.map(function (food) {
        return food.getFood(user)
      })
    })

  } catch (err) {
    console.log(err)
    next(err)
  }
})


// Save
router.put('/food/save/:foodname', auth.required, async (req, res, next) => {
  try {
    let [user, food] = await Promise.all([
      User.findOne({ sub: req.user.sub }),
      Food.findOne({ foodname: req.params.foodname })
    ])
    if (!user || !food) return res.sendStatus(401)
    await user.saveFood(food)
    return res.json({ isSaved: user.isSaved(food._id), savedCount: food.savedCount })

  } catch (err) {
    console.log(err)
    next(err)
  }
})

// Unsave
router.put('/food/unsave/:foodname', auth.required, async (req, res, next) => {
  try {
    let [user, food] = await Promise.all([
      User.findOne({ sub: req.user.sub }),
      Food.findOne({ foodname: req.params.foodname })
    ])
    if (!user || !food) return res.sendStatus(401)
    await user.unsaveFood(food)
    return res.json({ isSaved: user.isSavedFood(food._id), savedCount: food.savedCount })

  } catch (err) {
    console.log(err)
    next(err)
  }
})

module.exports = router
