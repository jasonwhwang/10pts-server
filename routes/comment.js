const router = require('express').Router()
const auth = require('./auth')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const Comment = mongoose.model('Comment')
const Review = mongoose.model('Review')
const Notification = require('./notification')

// POST - Comment
router.post('/comment/:reviewId', auth.required, async (req, res, next) => {
  try {
    let [user, review] = await Promise.all([
      User.findOne({ sub: req.user.sub }),
      Review.findById(req.params.reviewId, 'comments account')
        .populate({
          path: 'comments',
          populate: { path: 'account', select: 'username image' }
        })
    ])
    if (!user || !review || !req.body.comment) return res.sendStatus(401)

    let comment = new Comment()
    comment.body = req.body.comment
    comment.account = user._id
    comment.review = review._id
    review.comments.push(comment._id)

    await Notification.create('comment', review._id, user._id, review.account)

    await Promise.all([comment.save(), review.save()])

    let commentsList = review.comments.map(comment => {
      return {
        ...comment.toObject(),
        isLiked: comment.isLikedComment(user._id)
      }
    })
    let newComment = {
      ...comment.toObject(),
      account: {
        _id: user._id,
        username: user.username,
        image: user.image
      },
      isLiked: false
    }
    commentsList[commentsList.length - 1] = newComment

    return res.json({ comments: commentsList })

  } catch (err) {
    console.log(err)
    next(err)
  }
})

// DELETE - Comment
router.delete('/comment/:commentId', auth.required, async (req, res, next) => {
  try {
    let [user, comment] = await Promise.all([
      User.findOne({ sub: req.user.sub }),
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
          isLiked: comment.isLikedComment(user._id)
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
      Comment.findById(req.params.commentId, 'likes account')
    ])
    if (!user || !comment) return res.sendStatus(401)
    if (user._id.toString() === comment.account.toString()) return res.sendStatus(422)
    await comment.likeComment(user._id)
    return res.json({ isLiked: comment.isLikedComment(user._id), likesCount: comment.likes.length })

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
      Comment.findById(req.params.commentId, 'likes account')
    ])
    if (!user || !comment) return res.sendStatus(401)
    await comment.unlikeComment(user._id)
    return res.json({ isLiked: comment.isLikedComment(user._id), likesCount: comment.likes.length })

  } catch (err) {
    console.log(err)
    next(err)
  }
})

module.exports = router