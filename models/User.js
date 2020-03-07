var mongoose = require('mongoose')
var uniqueValidator = require('mongoose-unique-validator')

var UserSchema = new mongoose.Schema({
  sub: { type: String, unique: true, index: true, required: true },
  username: { type: String, unique: true, required: [true, "can't be blank"], match: [/^[a-zA-Z0-9]+$/, 'is invalid'], index: true },
  email: { type: String, unique: true, index: true, required: true },
  name: { type: String, default: '', index: true },
  image: { type: String, default: '' },
  bio: { type: String, default: '' },

  reviewsCount: { type: Number, default: 0 },
  followersCount: { type: Number, default: 0 },

  saved: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Food' }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
  likedComments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],

  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  notifications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Notification' }],

  flaggedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  flaggedReviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
  flaggedCount: { type: Number, default: 0 }
}, { timestamps: true })

UserSchema.index({ name: 'text', username: 'text' })

UserSchema.plugin(uniqueValidator, { message: 'is already taken.' })

// User Functions
// authUser parameter is requester
UserSchema.methods.getUser = function (authUser) {
  return {
    username: this.username,
    name: this.name,
    image: this.image,
    bio: this.bio,

    reviewsCount: this.reviewsCount,
    savedCount: this.saved.length,
    followersCount: this.followersCount,

    isFollowing: authUser ? authUser.isFollowing(this._id) : false,
    isFlagged: authUser ? authUser.isFlaggedUser(this._id) : false
  }
}

// Saved Functions
UserSchema.methods.saveFood = async function (food) {
  if (this.saved.indexOf(food._id) === -1) {
    this.saved.push(food._id)
    food.savedCount = food.savedCount + 1
    await Promise.all([this.save(), food.save()])
  }
}
UserSchema.methods.unsaveFood = async function (food) {
  if (this.saved.indexOf(food._id) !== -1) {
    this.saved.remove(food._id)
    food.savedCount = food.savedCount - 1
    await Promise.all([this.save(), food.save()])
  }
}
UserSchema.methods.isSavedFood = function (id) {
  return this.saved.some(function (savedId) {
    return savedId.toString() === id.toString()
  })
}

// Likes Functions
UserSchema.methods.like = async function (review) {
  if (this.likes.indexOf(review._id) === -1) {
    this.likes.push(review._id)
    review.likesCount = review.likesCount + 1
    await Promise.all([this.save(), review.save()])
  }
}
UserSchema.methods.unlike = async function (review) {
  if (this.likes.indexOf(review._id) !== -1) {
    this.likes.remove(review._id)
    review.likesCount = review.likesCount - 1
    await Promise.all([this.save(), review.save()])
  }
}
UserSchema.methods.isLiked = function (id) {
  return this.likes.some(function (likeId) {
    return likeId.toString() === id.toString()
  })
}

// Like Comment Functions
UserSchema.methods.likeComment = async function (comment) {
  if (this.likedComments.indexOf(comment._id) === -1) {
    this.likedComments.push(comment._id)
    comment.likesCount = comment.likesCount + 1
    await Promise.all([this.save(), comment.save()])
  }
}
UserSchema.methods.unlikeComment = async function (comment) {
  if (this.likedComments.indexOf(comment._id) !== -1) {
    this.likedComments.remove(comment._id)
    comment.likesCount = comment.likesCount - 1
    await Promise.all([this.save(), comment.save()])
  }
}
UserSchema.methods.isLikedComment = function (id) {
  return this.likes.some(function (likeId) {
    return likeId.toString() === id.toString()
  })
}

// Follow Functions
UserSchema.methods.follow = async function (user) {
  try {
    if (user.followers.indexOf(this._id) === -1) {
      user.followers.push(this._id)
      user.followersCount = user.followersCount + 1
    }
    if (this.following.indexOf(user._id) === -1) {
      this.following.push(user._id)
    }
    await Promise.all([this.save(), user.save()])
  } catch (err) {
    return err
  }
}
UserSchema.methods.unfollow = async function (user) {
  try {
    if (user.followers.indexOf(this._id) !== -1) {
      user.followers.remove(this._id)
      user.followersCount = user.followersCount - 1
    }
    this.following.remove(user._id)
    await Promise.all([this.save(), user.save()])
  } catch (err) {
    return err
  }
}
UserSchema.methods.isFollowing = function (id) {
  return this.following.some(function (followId) {
    return followId.toString() === id.toString()
  })
}

// Flag User Functions
UserSchema.methods.flagUser = async function (user) {
  try {
    if (this.flaggedUsers.indexOf(user._id) === -1) {
      this.flaggedUsers.push(user._id)
      user.flaggedCount = user.flaggedCount + 1
      await Promise.all([this.save(), user.save()])
    }
  } catch (err) {
    return err
  }
}
UserSchema.methods.unflagUser = async function (user) {
  try {
    if (this.flaggedUsers.indexOf(user._id) !== -1) {
      this.flaggedUsers.remove(user._id)
      user.flaggedCount = user.flaggedCount - 1
      await Promise.all([this.save(), user.save()])
    }
  } catch (err) {
    return err
  }
}
UserSchema.methods.isFlaggedUser = function (id) {
  return this.flaggedUsers.some(function (userId) {
    return userId.toString() === id.toString()
  })
}


// Flag Review Functions
UserSchema.methods.flagReview = async function (review) {
  try {
    if (this.flaggedReviews.indexOf(review._id) === -1) {
      this.flaggedReviews.push(review._id)
      review.flaggedCount = review.flaggedCount + 1
      await Promise.all([this.save(), review.save()])
    }
  } catch (err) {
    return err
  }
}
UserSchema.methods.unflagReview = async function (review) {
  try {
    if (this.flaggedReviews.indexOf(review._id) !== -1) {
      this.flaggedReviews.remove(review._id)
      review.flaggedCount = review.flaggedCount - 1
      await Promise.all([this.save(), review.save()])
    }
  } catch (err) {
    return err
  }
}
UserSchema.methods.isFlaggedReview = function (id) {
  return this.flaggedReviews.some(function (reviewId) {
    return reviewId.toString() === id.toString()
  })
}

mongoose.model('User', UserSchema)