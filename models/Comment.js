var mongoose = require('mongoose')

var CommentSchema = new mongoose.Schema({
  body: { type: String, default: '' },
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  review: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', index: true },
  likesCount: { type: Number, default: 0 }
}, { timestamps: true })

mongoose.model('Comment', CommentSchema)