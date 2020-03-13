var mongoose = require('mongoose')
const uslug = require('uslug')
const generate = require('nanoid/generate')

var FoodSchema = new mongoose.Schema({
  foodname: { type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/^[a-zA-Z0-9]+$/, 'is invalid'], index: true },
  foodTitle: { type: String, required: true, index: true },
  address: { type: String, required: true, index: true },

  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag', index: true }],
  tagsCount: {},
  photos: {},
  price: { type: Number, default: 0, index: true },

  pts: { type: Number, default: 0, required: true, index: true },
  ptsTaste: { type: Number, default: 0, required: true },
  ptsAppearance: { type: Number, default: 0, required: true },
  ptsTexture: { type: Number, default: 0, required: true },
  ptsAroma: { type: Number, default: 0, required: true },
  ptsBalance: { type: Number, default: 0, required: true },

  savedCount: { type: Number, default: 0 },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }]
}, { timestamps: true })

FoodSchema.index({ foodTitle: 'text', address: 'text' })
FoodSchema.index({ foodTitle: 1, address: 1 }, { unique: true })

FoodSchema.methods.getFood = function (authUser) {
  let isReviewed = -1
  
  this.reviews.forEach(function (review) {
    if(review.account.toString() === authUser._id.toString()) isReviewed = review.pts
  })

  return {
    ...this.toObject(),
    isSaved: authUser.isSaved(this._id),
    isReviewed: isReviewed,
    reviewsCount: this.reviews.length
  }
}

FoodSchema.methods.setFood = function (foodTitle, address) {
  let a = address.split(',')[0]
  let newId = generate('0123456789abcdefghijklmnopqrstuvwxyz', 12)
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
  this.photos[newReview.account] = newReview.photos

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
    this.reviews.push(newReview._id)
    this.price = addToAverage(this.price, this.reviews.length, newReview.price)
    this.pts = addToAverage(this.pts, this.reviews.length, newReview.pts)
    this.ptsTaste = addToAverage(this.ptsTaste, this.reviews.length, newReview.ptsTaste)
    this.ptsAppearance = addToAverage(this.ptsAppearance, this.reviews.length, newReview.ptsAppearance)
    this.ptsTexture = addToAverage(this.ptsTexture, this.reviews.length, newReview.ptsTexture)
    this.ptsAroma = addToAverage(this.ptsAroma, this.reviews.length, newReview.ptsAroma)
    this.ptsBalance = addToAverage(this.ptsBalance, this.reviews.length, newReview.ptsBalance)
  }
}

FoodSchema.methods.setTags = function (newTags, oldTags) {
  newTags.forEach(tag => {
    if (tag in this.tagsCount) {
      if (tag in oldTags) {
        let idx = oldTags.indexOf(tag)
        oldTags[idx] = null
      } else this.tagsCount.tag = this.tagsCount.tag + 1
    } else {
      this.tagsCount.tag = 1
      this.tags.push(tag)
    }
  })
  oldTags.forEach(tag => {
    if (!tag) continue
    if (tag in this.tagsCount) {
      this.tagsCount.tag = this.tagsCount.tag - 1
    }
    if (this.tagsCount.tag <= 0) {
      delete this.tagsCount.tag
      this.tags.remove(tag)
    }
  })
}

FoodSchema.methods.removeReview = function (review) {
  this.setTags([], review.tags)
  delete this.photos[newReview.account]

  if (this.reviews.length >= 2) {
    this.price = removeFromAverage(this.price, this.reviews.length, newReview.price)
    this.pts = removeFromAverage(this.pts, this.reviews.length, newReview.pts)
    this.ptsTaste = removeFromAverage(this.ptsTaste, this.reviews.length, newReview.ptsTaste)
    this.ptsAppearance = removeFromAverage(this.ptsAppearance, this.reviews.length, newReview.ptsAppearance)
    this.ptsTexture = removeFromAverage(this.ptsTexture, this.reviews.length, newReview.ptsTexture)
    this.ptsAroma = removeFromAverage(this.ptsAroma, this.reviews.length, newReview.ptsAroma)
    this.ptsBalance = removeFromAverage(this.ptsBalance, this.reviews.length, newReview.ptsBalance)
  }

  this.reviews.remove(review._id)
}

mongoose.model('Food', FoodSchema)