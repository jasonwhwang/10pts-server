var mongoose = require('mongoose')

var NotificationSchema = new mongoose.Schema({
  type: { type: String, default: '' },
  review: { type: mongoose.Schema.Types.ObjectId, ref: 'Review' },
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
}, { timestamps: true })

mongoose.model('Notification', NotificationSchema)