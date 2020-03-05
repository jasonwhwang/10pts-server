var mongoose = require('mongoose')
const Tag = mongoose.model('Tag')
const Comment = mongoose.model('Comment')
const uslug = require('uslug')
const generate = require('nanoid/generate')

var ReviewSchema = new mongoose.Schema({
  food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', index: true, required: true },
  foodname: { type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/^[a-zA-Z0-9]+$/, 'is invalid'], index: true },
  foodTitle: { type: String, required: true, index: true },
  address: { type: String, required: true, index: true },

  account: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag', index: true }],
  photos: [String],
  price: { type: Number, default: 0 },
  review: { type: String, default: '', required: true },

  pts: { type: Number, required: true },
  ptsTaste: { type: Number, required: true },
  ptsAppearance: { type: Number, required: true },
  ptsTexture: { type: Number, required: true },
  ptsAroma: { type: Number, required: true },
  ptsBalance: { type: Number, required: true },

  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  likesCount: { type: Number, default: 0 },
  flaggedCount: { type: Number, default: 0 },
}, { timestamps: true })

ReviewSchema.methods.getReview = function(authUser) {
  return {
    ...this,
    isLiked: authUser ? authUser.isLiked(this._id) : false,
    isSaved: authUser ? authUser.isSaved(this.food._id) : false,
    isFlagged: authUser ? authUser.isFlaggedReview(this._id) : false,
    account: {
      ...this.account,
      isFollowing: authUser ? authUser.isFollowing(this.account._id) : false
    },
    comments: this.comments.map(comment => {
      return {
        ...comment,
        isLiked: authUser.isLikedComment(comment._id)
      }
    })
  }
}

ReviewSchema.methods.getReviewBasic = function(authUser) {
  return {
    ...this,
    isLiked: authUser ? authUser.isLiked(this._id) : false,
    isSaved: authUser ? authUser.isSaved(this.food._id) : false,
    account: {
      ...this.account,
      isFollowing: authUser ? authUser.isFollowing(this.account._id) : false
    }
  }
}

ReviewSchema.methods.setTags = async function (newTags) {
  try {
    let newTagsId = await Promise.all(newTags.map(tag => { return tag._id }))
    let oldTagsId = await Promise.all(this.tags.map(tag => { return tag.toString() }))

    let returnTags = []
    for (let i = 0; i < newTagsId.length; i++) {
      let tagName = newTags[i].name.substring(0, 30)
      let foundTag = await Tag.findOne({ name: tagName })
      if (!foundTag) {
        let createTag = new Tag()
        createTag.name = uslug(tagName).replace(/-/g, ' ')
        createTag.count = 1
        await createTag.save()
        returnTags.push(createTag._id)
        continue
      }

      let tagIdx = oldTagsId.indexOf(newTagsId[i])
      if (tagIdx === -1) {
        foundTag.count = foundTag.count + 1
        await foundTag.save()
        returnTags.push(foundTag._id)

      } else {
        returnTags.push(this.tags[tagIdx])
        oldTagsId[tagIdx] = null
      }
    }

    for (let i = 0; i < oldTagsId.length; i++) {
      if (oldTagsId[i] === null) continue

      let foundTag = await Tag.findById(this.tags[i])
      if (!foundTag) continue
      foundTag.count = foundTag.count - 1
      if (foundTag.isEmpty()) await Tag.findByIdAndDelete(this.tags[i])
      else await foundTag.save()
    }

    this.tags = returnTags
    return

  } catch (err) {
    console.log(err)
  }
}

ReviewSchema.methods.setFood = function (foodTitle, address) {
  let a = address.split(',')[0]
  let newId = generate('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 12)
  this.foodname = uslug(foodTitle) + '-' + uslug(a) + '-' + newId
  this.foodTitle = foodTitle
  this.address = address
  this.food = null
}

ReviewSchema.methods.setDetails = function (r) {
  this.photos = r.photos
  this.price = r.price
  this.review = r.review
  this.pts = r.pts
  this.ptsTaste = r.ptsTaste
  this.ptsAppearance = r.ptsAppearance
  this.ptsTexture = r.ptsTexture
  this.ptsAroma = r.ptsAroma
  this.ptsBalance = r.ptsBalance
}

ReviewSchema.methods.getDetails = function (r) {
  return {
    tags: this.tags,
    photos: this.photos,
    price: this.price,
    review: this.review,
    pts: this.pts,
    ptsTaste: this.ptsTaste,
    ptsAppearance: this.ptsAppearance,
    ptsTexture: this.ptsTexture,
    ptsAroma: this.ptsAroma,
    ptsBalance: this.ptsBalance
  }
}

ReviewSchema.methods.deleteComments = function() {
  this.comments.forEach(comment => {
    Comment.findByIdAndDelete(comment)
  })
}

mongoose.model('Review', ReviewSchema)