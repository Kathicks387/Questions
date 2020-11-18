const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const authentication = require('../middleware/authentication');
const User = require('../models/User');
const {check, validationResult } = require('express-validator');


router.get('/posts', async(req, res) => {
    try {
        let posts = await Post.find();
        res.json(posts);
    } catch (error) {
        console.error(error.message);
        return res.status(500).json('Server error');
    }
});

router.get('/posts_most_liked', async (req, res) => {
    try {
        let posts = await Post.find().sort({ likes: -1 });
        res.json(posts);
    } catch (error) {
        console.error(error.message);
        return res.status(500).json('Server error');
    }
});


router.get('/posts/most_recent', async(req, res) => {
    try {
        let posts = await Post.find().sort({ date: -1});
        res.json(posts);
    } catch (error) {
        console.error(error.message);
        return res.status(500).json('Server error');
    }
});


router.get('/posts/most_commented', async(req, res) => {
    try {
        let posts = await Post.find().sort({ comments: -1});
        res.json(posts);
    } catch (error) {
        console.error(error.message);
        return res.status(500).json('Server error');
    }
});


router.get('/single_post/:post_id', async(req, res) => {
    try {
        let posts = await Post.findById(req.params.post_id);
        res.json(posts);
    } catch (error) {
        console.error(error.message);
        return res.status(500).json('Server error');
    }
});


router.get('/user_posts/:user_id', async(req, res) => {
    try {
        let posts = await Post.find({ user: req.params.user_id});
        res.json(posts);
    } catch (error) {
        console.error(error.message);
        return res.status(500).json('Server error');
    }
});


router.get('/user_posts', authentication, async(req, res) => {
    try {
        let posts = await Post.find();
        let userPosts = posts.filter(
            (post) => post.user.toString() === req.user.id.toString()
        );
        res.json(userPosts);
    } catch (error) {
        console.error(error.message);
        return res.status(500).json('Server error');
    }
});

router.post(
      '/',
      authentication,
      [check('textOfPost', 'Text is required!').not().isEmpty()],
      async (req, res) => {
        let { textOfPost } = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(400).json({ errors: errors.array() });
    
        try {
          let user = await User.findById(req.user.id).select('-password');
          if (!user) return res.status(404).json('User not found');
          let newPost = new Post({
            textOfPost,
            firstName: user.firstName,
            avatar: user.avatar,
            user: req.user.id
          });
    
          await newPost.save();
          res.json('Post created');
        } catch (error) {
          console.error(error.message);
          return res.status(500).json('Server error');
        }
      }
     );

     router.put(
        '/search_for_post',
  [check('searchInput', 'Search is empty').not().isEmpty()],

  async (req, res) => {
    const { searchInput } = req.body;
    const errors = validationResult(req);

    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
    try {
      let posts = await Post.find();
      if (searchInput === '' || searchInput === null) {
        res.status(401).json(posts);
      } else {
        const findPostBySearchInput = posts.filter(
          (post) =>
            post.textOfPost.toString().toLowerCase().split(' ').join('') ===
            searchInput.toString().toLowerCase().split(' ').join('')
        );
        res.json(findPostBySearchInput);
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json('Server error');
    }
  }
);

router.put('/likes/:post_id', authentication, async (req, res) => {
  try {
    let post = await Post.findById(req.params.post_id);
    if (!post) return res.status(404).json('Post not found');

    if (post.likes.find((like) => like.user.toString() === req.user.id))
     return res.status(401).json('You have already liked this post!');

    let newLike = {
      user: req.user.id,
    };
    
    post.likes.unshift(newLike);
    await post.save();

    res.json(post);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json('Server error');
  }
});

router.put("/add_comment/:post_id", authentication, [check('textOfComment', 'Comment is empty').not().isEmpty()], async (req, res) => {
    const { textOfComment } = req.body;
    const errors = validationResult(req);
  
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
      try {
        let post = await Post.findById(req.params.post_id);
        let user =  await User.findById(req.user.id).select('-password');
        
        if(!user) return res.status(404).json('User not found');
        
        if(!post) return res.status(404).json('Post not found');
        
  
        let newComment = {
          textOfComment,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar
        }
        post.comments.unshift(newComment);
        await post.save();
        res.json("Comment has been added")
      } catch (error) {
        console.error(error.message);
      return res.status(500).json('Server error');
      }
  });
  
  router.put("/like_comment/:post_id/:comment_id", authentication, async(req, res) => {
      try {
        let post = await Post.findById(req.params.post_id);
        if (!post){
          return res.status(401).json('Post not found');
        }
        const commentFromPost = post.comments.find((comment) => comment._id.toString() === req.params.comment_id.toString());
        if (!commentFromPost) return res.status(404).json("Comment not found");
        let newLike = {
          user: req.user.id,
        };
        commentFromPost.likes.unshift(newLike);
        await post.save();
        res.json("Comment is liked");
      } catch (error) {
        console.error(error.message);
        return res.status(500).json('Server error');
      }
    });

module.exports = router;