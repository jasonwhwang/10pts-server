var mongoose = require('mongoose')

var CommentSchema = new mongoose.Schema({
  body: { type: String, default: '' },
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  review: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', index: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true })

// Like Comment Functions
CommentSchema.methods.likeComment = async function (id) {
  if (this.likes.indexOf(id) === -1) {
    this.likes.push(id)
    await this.save()
  }
}
CommentSchema.methods.unlikeComment = async function (id) {
  if (this.likes.indexOf(id) !== -1) {
    this.likes.remove(id)
    await this.save()
  }
}
CommentSchema.methods.isLikedComment = function (id) {
  return this.likes.some(function (userId) {
    return userId.toString() === id.toString()
  })
}

mongoose.model('Comment', CommentSchema)