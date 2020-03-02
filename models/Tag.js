var mongoose = require('mongoose')

var TagSchema = new mongoose.Schema({
  name: { type: String, default: '', index: true, unique: true },
  main: Boolean,
  count: { type: Number, default: 0 }
})

TagSchema.methods.isEmpty = function () {
  return !this.main && this.count <= 0
}

mongoose.model('Tag', TagSchema)