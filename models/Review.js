var mongoose = require('mongoose')
const Tag = mongoose.model('Tag')

var ReviewSchema = new mongoose.Schema({
  food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', index: true, required: true },
  foodname: { type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/^[a-zA-Z0-9]+$/, 'is invalid'], index: true },
  foodTitle: { type: String, required: true, index: true },
  address: { type: String, required: true, index: true },
  
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag', index: true }],
  photos: [String],
  price: { type: Number, default: 0 },

  pts: { type: Number, default: 5, required: true },
  ptsTaste: { type: Number, default: 5, required: true },
  ptsAppearance: { type: Number, default: 5, required: true },
  ptsTexture: { type: Number, default: 5, required: true },
  ptsAroma: { type: Number, default: 5, required: true },
  ptsBalance: { type: Number, default: 5, required: true },
  
  review: { type: String, default: '', required: true },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  likesCount: { type: Number, default: 0 },
  flaggedCount: { type: Number, default: 0 },
}, { timestamps: true })

ReviewSchema.methods.putTags = async function (newTags) {
  try {
    let newTagsId = await Promise.all(newTags.map(tag => { return tag._id }))
    let oldTagsId = await Promise.all(this.tags.map(tag => { return tag.toHexString() }))

    let returnTags = []
    for (let i = 0; i < newTagsId.length; i++) {
      let foundTag = await Tag.findOne({ name: newTags[i].name })
      if (!foundTag) {
        let createTag = new Tag()
        createTag.name = newTags[i].name
          .replace(/[^A-Za-z0-9& ]/gi, '')
          .toLowerCase().replace(/(?:^|\s)\S/g, function (a) { return a.toUpperCase() })
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
      if(oldTagsId[i] === null) continue

      let foundTag = await Tag.findById(this.tags[i])
      if(!foundTag) continue
      foundTag.count = foundTag.count - 1
      if (foundTag.isEmpty()) await Tag.findByIdAndDelete(this.tags[i])
      else await foundTag.save()
    }

    return returnTags
  } catch (err) {
    console.log(err)
  }
}


mongoose.model('Review', ReviewSchema)