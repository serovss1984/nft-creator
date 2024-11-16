require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const cv = require('opencv4nodejs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(
  session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true,
  })
);

// Upload configuration
const upload = multer({ dest: process.env.UPLOAD_DIR || 'uploads/' });

// Routes
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    req.session.user = { username };
    return res.redirect('/dashboard');
  }
  res.send('Invalid credentials');
});

app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }
  res.render('dashboard', { username: req.session.user.username });
});

app.post('/generate-nft', upload.single('image'), async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }

  const inputPath = req.file.path;
  const outputPath = path.join(
    process.env.OUTPUT_DIR || 'outputs/',
    `${Date.now()}_nft.png`
  );

  try {
    const image = cv.imread(inputPath);
    const grayImage = image.cvtColor(cv.COLOR_BGR2GRAY);

    const orbDetector = new cv.ORBDetector();
    const keypoints = orbDetector.detect(grayImage);

    const resultImage = cv.drawKeyPoints(image, keypoints);
    cv.imwrite(outputPath, resultImage);

    fs.unlinkSync(inputPath); // Удаляем оригинал после обработки

    res.send(`<h1>NFT Generated</h1><a href="/dashboard">Back</a>`);
  } catch (error) {
    res.status(500).send('Error generating NFT: ' + error.message);
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
