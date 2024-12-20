var mongoose = require('mongoose')
const uslug = require('uslug')
const generate = require('nanoid/generate')

var FoodSchema = new mongoose.Schema({
  foodname: { type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/[a-z0-9\-]+$/, 'is invalid'], index: true },
  foodTitle: { type: String, required: true, index: true },
  address: { type: String, required: true, index: true },

  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag', index: true }],
  tagsCount: { type: mongoose.Schema.Types.Mixed, default: {} },
  photos: { type: mongoose.Schema.Types.Mixed, default: {} },
  price: { type: Number, default: 0, index: true },

  pts: { type: Number, default: 0, required: true, index: true },
  ptsTaste: { type: Number, default: 0, required: true },
  ptsAppearance: { type: Number, default: 0, required: true },
  ptsTexture: { type: Number, default: 0, required: true },
  ptsAroma: { type: Number, default: 0, required: true },
  ptsBalance: { type: Number, default: 0, required: true },

  savedCount: { type: Number, default: 0 },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }]
}, { timestamps: true, minimize: false })

FoodSchema.index({ foodTitle: 'text', address: 'text' })
FoodSchema.index({ foodTitle: 1, address: 1 }, { unique: true })

FoodSchema.methods.getFood = function (authUser) {
  let isReviewed = -1

  if (authUser) {
    this.reviews.forEach(function (review) {
      if (review.account._id.toString() === authUser._id.toString()) isReviewed = review.pts
    })
  }

  let photos = Object.values(this.photos).flat()

  return {
    ...this.toObject(),
    photos: photos,
    isSaved: authUser ? authUser.isSaved(this._id) : false,
    isReviewed: isReviewed,
    reviewsCount: this.reviews.length
  }
}

FoodSchema.methods.setFood = function (foodTitle, address) {
  let a = address.split(',')[0]
  let newId = generate('0123456789abcdefghijklmnopqrstuvwxyz', 8)
  this.foodname = uslug(foodTitle) + '-' + uslug(a) + '-' + newId
  this.foodTitle = foodTitle
  this.address = address
}

let addToAverage = (average, size, val) => { return (size * average + val) / (size + 1) }
let updateAverage = (average, size, oldVal, newVal) => { return (size * average - oldVal + newVal) / size }
let removeFromAverage = (average, size, val) => { return (size * average - val) / (size - 1) }

FoodSchema.methods.setDetails = function (newReview, oldReview) {
  let oldTags = oldReview ? oldReview.tags : []
  this.setTags(newReview.tags, oldTags)

  let accountTxt = newReview.account
  this.photos[accountTxt] = newReview.photos
  this.markModified('photos')

  let hasReview = this.reviews.some(function (reviewId) {
    return reviewId.toString() === newReview._id.toString()
  })

  if (hasReview && oldReview) {
    this.price = updateAverage(this.price, this.reviews.length, oldReview.price, newReview.price)
    this.pts = updateAverage(this.pts, this.reviews.length, oldReview.pts, newReview.pts)
    this.ptsTaste = updateAverage(this.ptsTaste, this.reviews.length, oldReview.ptsTaste, newReview.ptsTaste)
    this.ptsAppearance = updateAverage(this.ptsAppearance, this.reviews.length, oldReview.ptsAppearance, newReview.ptsAppearance)
    this.ptsTexture = updateAverage(this.ptsTexture, this.reviews.length, oldReview.ptsTexture, newReview.ptsTexture)
    this.ptsAroma = updateAverage(this.ptsAroma, this.reviews.length, oldReview.ptsAroma, newReview.ptsAroma)
    this.ptsBalance = updateAverage(this.ptsBalance, this.reviews.length, oldReview.ptsBalance, newReview.ptsBalance)
  } else {
    this.price = addToAverage(this.price, this.reviews.length, newReview.price)
    this.pts = addToAverage(this.pts, this.reviews.length, newReview.pts)
    this.ptsTaste = addToAverage(this.ptsTaste, this.reviews.length, newReview.ptsTaste)
    this.ptsAppearance = addToAverage(this.ptsAppearance, this.reviews.length, newReview.ptsAppearance)
    this.ptsTexture = addToAverage(this.ptsTexture, this.reviews.length, newReview.ptsTexture)
    this.ptsAroma = addToAverage(this.ptsAroma, this.reviews.length, newReview.ptsAroma)
    this.ptsBalance = addToAverage(this.ptsBalance, this.reviews.length, newReview.ptsBalance)
    this.reviews.push(newReview._id)
  }
}

FoodSchema.methods.setTags = function (newTags, oldTags) {
  let oldTagsStr = oldTags.map(tag => { return tag.toString() })

  newTags.forEach(t => {
    let tag = t.toString()
    let idx = oldTagsStr.indexOf(tag)
    if (tag in this.tagsCount) {
      if(idx === -1) this.tagsCount[tag] = this.tagsCount[tag] + 1
    } else {
      this.tagsCount[tag] = 1
      this.tags.push(t)
    }
    if(idx !== -1) oldTagsStr[idx] = null
  })

  oldTagsStr.forEach((tag, index) => {
    if (!tag) return
    if (tag in this.tagsCount) {
      this.tagsCount[tag] = this.tagsCount[tag] - 1
    }
    if (this.tagsCount[tag] <= 0) {
      delete this.tagsCount[tag]
      this.tags.remove(oldTags[index])
    }
  })
  this.markModified('tagsCount')
}

FoodSchema.methods.removeReview = function (review) {
  this.setTags([], review.tags)
  delete this.photos[review.account]
  this.markModified('photos')

  if (this.reviews.length >= 2) {
    this.price = removeFromAverage(this.price, this.reviews.length, review.price)
    this.pts = removeFromAverage(this.pts, this.reviews.length, review.pts)
    this.ptsTaste = removeFromAverage(this.ptsTaste, this.reviews.length, review.ptsTaste)
    this.ptsAppearance = removeFromAverage(this.ptsAppearance, this.reviews.length, review.ptsAppearance)
    this.ptsTexture = removeFromAverage(this.ptsTexture, this.reviews.length, review.ptsTexture)
    this.ptsAroma = removeFromAverage(this.ptsAroma, this.reviews.length, review.ptsAroma)
    this.ptsBalance = removeFromAverage(this.ptsBalance, this.reviews.length, review.ptsBalance)
  }

  this.reviews.remove(review._id)
}

mongoose.model('Food', FoodSchema)