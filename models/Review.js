var mongoose = require('mongoose')
const Tag = mongoose.model('Tag')
const Comment = mongoose.model('Comment')
const uslug = require('uslug')
const generate = require('nanoid/generate')

var ReviewSchema = new mongoose.Schema({
  food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', index: true, required: true },
  foodname: { type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/[a-z0-9\-]+$/, 'is invalid'], index: true },
  foodTitle: { type: String, required: true, index: true },
  address: { type: String, required: true, index: true },

  account: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag', index: true, required: true }],
  photos: { type: [String], required: true },
  price: { type: Number, required: true },
  review: { type: String, required: true },

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

ReviewSchema.index({ account: 1, foodTitle: 1, address: 1 }, { unique: true })
ReviewSchema.index({ account: 1, foodname: 1 }, { unique: true })

ReviewSchema.methods.getReview = function(authUser) {
  return {
    ...this.toObject(),
    isLiked: authUser ? authUser.isLiked(this._id) : false,
    isSaved: authUser ? authUser.isSaved(this.food._id) : false,
    isFlagged: authUser ? authUser.isFlaggedReview(this._id) : false,
    account: {
      ...this.account.toObject(),
      isFollowing: authUser ? authUser.isFollowing(this.account._id) : false
    },
    comments: this.comments.map(comment => {
      return {
        ...comment.toObject(),
        isLiked: authUser.isLikedComment(comment._id)
      }
    })
  }
}

ReviewSchema.methods.getReviewBasic = function(authUser) {
  return {
    ...this.toObject(),
    isLiked: authUser ? authUser.isLiked(this._id) : false,
    isSaved: authUser ? authUser.isSaved(this.food._id) : false,
    account: {
      ...this.account.toObject(),
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
          .replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase() }).substring(0, 30)
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

ReviewSchema.methods.setFood = function (foodTitle, address, account, food) {
  let a = address.split(',')[0]
  let newId = generate('0123456789abcdefghijklmnopqrstuvwxyz', 12)
  this.foodname = uslug(foodTitle) + '-' + uslug(a) + '-' + newId
  if(foodTitle) this.foodTitle = foodTitle
  if(address) this.address = address
  if(account) this.account = account
  if(food) this.food = food
}

ReviewSchema.methods.setDetails = function (r) {
  if(r.photos) this.photos = r.photos
  if(r.price) this.price = parseInt(r.price)
  if(r.review) this.review = r.review
  if(r.pts) this.pts = parseInt(r.pts)
  if(r.ptsTaste) this.ptsTaste = parseInt(r.ptsTaste)
  if(r.ptsAppearance) this.ptsAppearance = parseInt(r.ptsAppearance)
  if(r.ptsTexture) this.ptsTexture = parseInt(r.ptsTexture)
  if(r.ptsAroma) this.ptsAroma = parseInt(r.ptsAroma)
  if(r.ptsBalance) this.ptsBalance = parseInt(r.ptsBalance)
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