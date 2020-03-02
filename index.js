const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const morgan = process.env.APP_ENV === 'dev' ? require('morgan') : null
if (process.env.APP_ENV === 'dev') require('dotenv').config()

mongoose.connect(process.env.M_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true
}, function (err) {
  err ? console.log(err) : console.log("Server Connected.")
})

const app = express()
app.use(cors({ origin: process.env.APP_ENV === 'dev' ? 'http://localhost:3000' : 'https://10pts.co' }))
if(process.env.APP_ENV === 'dev') app.use(morgan('dev'))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

require('./models')
app.use('/api', require('./routes'))
app.get('/', (req, res) => {
  res.send('10pts API')
})

app.use(function (req, res, next) {
  var err = new Error('Not Found')
  err.status = 404
  next(err)
})
app.use(function (err, req, res, next) {
  res.status(err.status || 500)
  res.json({
    errors: [{
      error: err.message
    }]
  })
})

const port = process.env.PORT || 5000
app.listen(port, () => {
  console.log('API Port: ' + port)
})