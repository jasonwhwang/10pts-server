# 10pts API
All API endpoints for 10pts. Endpoints still in development and subject to change.

### Authentication Header:
`Authorization: Bearer jwt.token.here`

### API Url
Prefix all APIs with `/api`

## User:
### Get Private Endpoint
`GET /private`
Returns a test endpoint to check if authenticated endpoint is functional.

### Get Authenticated User
`GET /user`
Returns Authenticated User profile from token sub. Creates new user if profile not found and email verified.

### Put User
`PUT /user`
Update user account. Account attributes include the following: username, name, image, bio

### Get Notifications
`GET /user/notifications`
Returns all user notifications

## Account
### Get Reviews
`GET /account/reviews/:username`
Returns account profile with reviews

### Get Saved
`GET /account/saved/:username`
Returns account profile with saved food

### Get Likes
`GET /account/likes/:username`
Returns account profile with likes, liked reviews

### Get Followers
`GET /account/followers/:username`
Returns account profile with followers

### Get Reviews
`GET /account/following/:username`
Returns account profile with following

### Get Accounts
`GET /accounts`
Returns list of accounts matching specified query. Query based on following: keywords

### Put Follow
`PUT /account/follow/:username`
Authenticated User follows account

### Put Unollow
`PUT /account/unfollow/:username`
Authenticated User unfollows account

## Tag:
### Get Tags
`GET /tags`
Returns a list of tag suggestions

## Review:
### Get Review
`GET /review/:foodname/:username`
Get the review by foodname and account username

### Post Review
`POST /review`
Create a new review from the post body and create notifications

### Put Review
`PUT /review/:reviewId`
Modify and update an existing review

### Delete Review
`DELETE /review/:reviewId`
Delete the specified review

### Get Reviews
`GET /reviews`
Get all current reviews, shown on main front page.

### Put Like Review
`PUT /review/like/:reviewId`
Like the specified review

### Put Unlike Review
`PUT /review/unlike/:reviewId`
Unlike the specified review

## Food:
### Get Food
`GET /food/:foodname`
Get the food by foodname

### Get All Food
`GET /food`
Returns list of food matching specified query. Query based on following: keywords, min/max pts, min/max price, tags

### Get Food Suggestions
`GET /food/suggestions/all`
Returns list of food at a restaurant. Query based on following: address

### Put Save Food
`PUT /food/save/:foodname`
Save food to user saved

### Put Unsave Food
`PUT /food/unsave/:foodname`
Unsave food from user saved

## Comment:
### Post Comment
`POST /comment`
Post new comment to a review

### Delete Comment
`DELETE /comment/:commentId`
Delete comment from a review

### Put Like Comment
`PUT /comment/like/:commentId`
Like a comment

### Put Unlike Comment
`PUT /comment/unlike/:commentId`
Unlike a comment