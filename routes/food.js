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
    if(!user || !food) return res.sendStatus(401)
    return res.json({ food: food.getFood(user) })

  } catch (err) {
    console.log(err)
    next(err)
  }
})


// GET - All Current Food
router.get('/food', auth.optional, async (req, res, next) => {
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
    let allFood = await Food.find(query, options)
      .limit(Number(limit))
      .skip(Number(offset))
      .sort(options)

    return res.json({
      food: allFood.map(function (food) {
        return food.getFood(user)
      })
    })

  } catch (err) {
    console.log(err)
    next(err)
  }
})


// Save
router.put('/food/save/:foodId', auth.required, async (req, res, next) => {
  try {
    let [user, food] = await Promise.all([
      User.findOne({ sub: req.user.sub }),
      Food.findById(req.params.foodId)
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
router.put('/food/unsave/:foodId', auth.required, async (req, res, next) => {
  try {
    let [user, food] = await Promise.all([
      User.findOne({ sub: req.user.sub }),
      Food.findById(req.params.foodId)
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
