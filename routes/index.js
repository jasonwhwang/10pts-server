const router = require('express').Router()

router.use('/', require('./user'))
router.use('/', require('./account'))
router.use('/', require('./tag'))
router.use('/', require('./comment'))
router.use('/', require('./review'))
router.use('/', require('./food'))

// ERR - Validation Error Handler
router.use(function (err, req, res, next) {
  if (err.name === 'ValidationError') {
    return res.status(422).json({
      error: error = Object.values(err.errors)[0].message,
      errors: Object.keys(err.errors).reduce(function (errors, key) {
        errors[key] = err.errors[key].message

        return errors
      }, {})
    })
  }
  return next(err)
})

module.exports = router