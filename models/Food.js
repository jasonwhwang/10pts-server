var mongoose = require('mongoose')

var FoodSchema = new mongoose.Schema({
  foodname: { type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/^[a-zA-Z0-9]+$/, 'is invalid'], index: true },
  foodTitle: { type: String, required: true, index: true },
  address: { type: String, required: true, index: true },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag', index: true }],
  tagsCount: {},
  photos: [String],
  price: { type: Number, default: 0, index: true },

  pts: { type: Number, default: 5, index: true },
  ptsTaste: { type: Number, default: 5 },
  ptsAppearance: { type: Number, default: 5 },
  ptsTexture: { type: Number, default: 5 },
  ptsAroma: { type: Number, default: 5 },
  ptsBalance: { type: Number, default: 5 },

  savedCount: { type: Number, default: 0 },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }]
}, { timestamps: true })

FoodSchema.index({ foodTitle: 'text', address: 'text' })

FoodSchema.methods.getDetails = function() {
  return {
    foodname: this.foodname,
    foodTitle: this.foodTitle,
    address: this.address
  }
}

mongoose.model('Food', FoodSchema)