const router = require('express').Router()
const auth = require('./auth')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const Tag = mongoose.model('Tag')
const Challenge = mongoose.model('Challenge')
const generate = require('nanoid/generate')

// Delete Challenge
router.delete('/challenge', auth.required, async (req, res, next) => {
  try {
    let user = await User.findOne({ sub: req.user.sub })
    if (!user) { return res.sendStatus(401) }

    let challenge = await Challenge.findOne({ sub: req.body.challenge.sub })
    if (!challenge) { return res.sendStatus(401) }

    if (user._id.toString() === challenge.author.toString()) {
      // Add Delete for other Schemas HERE------
      challenge.tags = await challenge.putTags([])

      // Finally Delete Challenge
      await challenge.remove()
      return res.sendStatus(204)
    } else {
      return res.sendStatus(403)
    }
  } catch (err) {
    console.log(err)
    next(err)
  }
})

// Post Challenge
router.post('/challenge', auth.required, async (req, res, next) => {
  try {
    let user = await User.findOne({ sub: req.user.sub })
    if (!user) { return res.sendStatus(401) }

    let newChallenge = null
    if (req.body.challenge.sub !== null) {
      newChallenge = await Challenge.findOne({ sub: req.body.challenge.sub })
      if (String(newChallenge.author) !== String(user._id)) {
        return res.sendStatus(401)
      }
    } else {
      newChallenge = new Challenge()
      newChallenge.author = user._id
    }

    let newSub = null
    if(!newChallenge.sub) {
      newSub = generate('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 5)
      newChallenge.sub = newSub
    } else {
      newSub = newChallenge.sub.split("-")[0]
    }
    let subWords = req.body.challenge.title
      .replace(/[^A-Za-z0-9& ]/gi, '').replace(/\s+/g, '-').toLowerCase()
    if(subWords) {
      newChallenge.sub = newSub + "-" + subWords
    }

    newChallenge.image = req.body.challenge.image
    newChallenge.title = req.body.challenge.title
    newChallenge.heading = req.body.challenge.heading
    newChallenge.body = req.body.challenge.body
    newChallenge.tags = await newChallenge.putTags(req.body.challenge.tags)
    newChallenge.status = req.body.challenge.status
    newChallenge.type = req.body.challenge.type
    newChallenge.budget = parseInt(req.body.challenge.budget)
    newChallenge.startDate = new Date(req.body.challenge.startDate)
    newChallenge.endDate = new Date(req.body.challenge.endDate)
    newChallenge.companySize = req.body.challenge.companySize
    newChallenge.industryCategory = req.body.challenge.industryCategory

    await newChallenge.save()
    return res.json({ challenge: newChallenge.getChallenge(user) })

  } catch (err) {
    console.log(err)
    next(err)
  }
})

// Get Challenge
router.get('/challenge/info/:challengeSub', auth.optional, async (req, res, next) => {
  try {
    let authUser = null
    if (req.user) authUser = await User.findOne({ sub: req.user.sub })
    let aChallenge = await Challenge.findOne({ sub: req.params.challengeSub })
      .populate('author', 'username name image role company companyImage companyWebsite companySize industryCategory industryName')
      .populate('tags', '-countChallenges -countMembers -countProposals -__v')
    
    if (!aChallenge) { return res.sendStatus(404) }
    return res.json({ challenge: aChallenge.getChallenge(authUser) })

  } catch (err) {
    console.log(err)
    next(err)
  }
})

// Get Challenge of Member
router.get('/challenge/member/:username', auth.optional, async (req, res, next) => {
  try {
    let authUser = null
    if (req.user) authUser = await User.findOne({ sub: req.user.sub })
    let member = await User.findOne({ username: req.params.username })
    if (!member) { return res.sendStatus(404) }

    let allChallenge = await Challenge.find({ author: member._id })

    return res.json({
      list: allChallenge.map(function (aChallenge) {
        return aChallenge.getChallenge(authUser);
      })
    })

  } catch (err) {
    console.log(err)
    next(err)
  }
})


// Get All Challenge
router.get('/challenge/all', auth.optional, async (req, res, next) => {
  try {
    let tag = null
    if(req.query.community) {
      tag = await Tag.findOne({ name: req.query.community })
      if(!tag) return res.sendStatus(404)
    }
    let query = {}
    if(tag) query.tags = tag._id
    if(req.query.type) query.type = req.query.type
    if(req.query.status) query.status = req.query.status
    if(req.query.industryCategory) query.industryCategory = req.query.industryCategory
    if(req.query.companySize) query.companySize = req.query.companySize
    
    let min = {}, max = {}
    if(req.query.budgetLow) min =  { $gte: req.query.budgetLow }
    if(req.query.budgetHigh) max = { $lte: req.query.budgetHigh }
    let newBudget = {...min, ...max}
    if(Object.entries(newBudget).length !== 0 || newBudget.constructor !== Object) query.budget = newBudget

    let textSearch = {}, options = {}
    if(req.query.keywords) textSearch = {$text: {$search: req.query.keywords}}
    if(Object.entries(textSearch).length !== 0 || textSearch.constructor !== Object) {
      query = {...query, ...textSearch}
      options = { score: { $meta: "textScore" } }
    }

    let limit = 20
    let offset = 0
    if (typeof req.query.offset !== 'undefined') {
      offset = req.query.offset;
    }
    let authUser = null
    if (req.user) {
      authUser = await User.findOne({ sub: req.user.sub })
    }
    let allChallenge = await Challenge.find(query, options)
      .limit(Number(limit))
      .skip(Number(offset))
      .populate('author', 'username name image role company companyImage')
      .sort(options)
    return res.json({
      list: allChallenge.map(function (aChallenge) {
        return aChallenge.getChallenge(authUser);
      })
    })

  } catch (err) {
    console.log(err)
    next(err)
  }
})

module.exports = router

// Notes
// .populate({
//   path: 'comments',
//   populate: {
//     path: 'author',
//     select: 'username name image role company'
//   }
// })