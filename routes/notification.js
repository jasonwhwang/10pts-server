const mongoose = require('mongoose')
const User = mongoose.model('User')
const Notification = mongoose.model('Notification')

export const createNotification = (type, review, from, to) => {
  let account = await User.findById(to)
  if (!account) throw new Error('Missing values.')

  // Create Notification
  let notification = new Notification()
  notification.type = type
  notification.review = review
  notification.from = from
  notification.to = to
  await notification.save()

  // Add notifications to account
  account.notifications.unshift(notification._id)
  if (account.notifications.length > 30) {
    let deleteN = account.notifications.pop()
    await Notification.findByIdAndDelete(deleteN)
  }
  await account.save()
}