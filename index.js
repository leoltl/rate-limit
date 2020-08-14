const express = require("express");
const session = require('express-session')
const app = express();

const PORT = process.env.PORT || 5000;

app.set('view engine', 'ejs')
app.use(session({
  secret: process.env.SESSION_SECRET || 'you_cannot_guest_this'
}))

function setUser(req, res, next) {
  req.locals = { user: { id: req.session.user || null } };
  next();
}
app.use(setUser);

const { makeDynamicMiddlewares } = require("./rate-limiter");
const [dynamicLimiter, changeMiddleware] =  makeDynamicMiddlewares()

app.get("/set-limit-strategy", (req, res) => {
  changeMiddleware(req.query.limiter);
  res.redirect("/");
});

app.get("/set-user", (req, res) => {
  req.session.user = req.query.user || null;
  res.redirect("/");
});

app.get("/", dynamicLimiter, async (req, res) => {
  setTimeout(() => {
    res.render("index");
  }, 3000)
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});