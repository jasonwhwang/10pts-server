const router = require('express').Router()
const auth = require('./auth')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const Comment = mongoose.model('Comment')
const Review = mongoose.model('Review')
const Notification = require('./notification')

// POST - Comment
router.post('/comment', auth.required, async (req, res, next) => {
  try {
    let [user, review] = await Promise.all([
      User.findOne({ sub: req.user.sub }, '_id'),
      Review.findById(req.body.comment.review, 'comments account')
        .populate({
          path: 'comments',
          populate: [{ path: 'account', select: 'username image' }]
        })
    ])
    if (!user || !review || !req.body.comment) return res.sendStatus(401)

    let comment = new Comment()
    comment.body = req.body.comment.body
    comment.account = user._id
    comment.review = review._id
    review.comments.push(comment._id)

    await Notification.create('comment', review._id, user._id, review.account)

    await Promise.all([comment.save(), review.save()])
    return res.json({
      comments: review.comments.map(comment => {
        return {
          ...comment.toObject(),
          isLiked: user.isLikedComment(comment._id)
        }
      })
    })

  } catch (err) {
    console.log(err)
    next(err)
  }
})

// DELETE - Comment
router.delete('/comment/:commentId', auth.required, async (req, res, next) => {
  try {
    let [user, comment] = await Promise.all([
      User.findOne({ sub: req.user.sub }, '_id'),
      Comment.findById(req.params.commentId, 'account review')
    ])
    if (!user || !comment) return res.sendStatus(401)

    if (user._id.toString() !== comment.account.toString()) return res.sendStatus(403)
    let review = await Review.findById(comment.review, 'comments')
      .populate({
        path: 'comments',
        populate: [{ path: 'account', select: 'username image' }]
      })
    if (review) {
      review.comments.remove(comment._id)
      review.save()
    }
    await comment.remove()
    return res.json({
      comments: review.comments.map(comment => {
        return {
          ...comment.toObject(),
          isLiked: user.isLikedComment(comment._id)
        }
      })
    })

  } catch (err) {
    console.log(err)
    next(err)
  }
})

// PUT - Like Comment
router.put('/comment/like/:commentId', auth.required, async (req, res, next) => {
  try {
    let [user, comment] = await Promise.all([
      User.findOne({ sub: req.user.sub }, '_id'),
      Comment.findById(req.params.commentId, 'likesCount')
    ])
    if (!user || !comment) return res.sendStatus(401)
    if(user._id.toString() === comment.account.toString()) return res.sendStatus(422)
    await user.likeComment(comment)
    return res.json({ isLiked: user.isLikedComment(comment._id), likesCount: comment.likesCount })

  } catch (err) {
    console.log(err)
    next(err)
  }
})

// PUT - Unlike Comment
router.put('/comment/unlike/:commentId', auth.required, async (req, res, next) => {
  try {
    let [user, comment] = await Promise.all([
      User.findOne({ sub: req.user.sub }, '_id'),
      Comment.findById(req.params.commentId, 'likesCount')
    ])
    if (!user || !comment) return res.sendStatus(401)
    await user.unlikeComment(comment)
    return res.json({ isLiked: user.isLikedComment(comment._id), likesCount: comment.likesCount })

  } catch (err) {
    console.log(err)
    next(err)
  }
})

module.exports = router