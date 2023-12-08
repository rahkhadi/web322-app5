
const legoData = require("./modules/legoSets");
const authData = require("./modules/auth-service");
const express = require("express");
const clientSessions = require("client-sessions");
const app = express();

const HTTP_PORT = process.env.PORT || 8080;

const ensureLogin = (req, res, next) => {
  if (!req.session.user) {
    res.redirect("/login");
  } else {
    next();
  }
};

app.set("view engine", "ejs");

app.use(express.static("public"));

app.use(express.urlencoded({ extended: true }));

app.use(
  clientSessions({
    cookieName: "session", 
    secret: "web322-assignment6",
    duration: 2 * 60 * 1000, 
    activeDuration: 1000 * 60, 
  })
);

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/about", (req, res) => {
    res.render("about");
});

app.get("/lego/sets", (req, res) => {
    if (req.query.theme) {
        legoData.getSetsByTheme(req.query.theme).then((sets) => {
            res.render("sets", {sets: sets}); 
        }).catch((err) => {
            res.status(404).render("404", { message: "Unable to find requested set." });
        });
    } else {
        legoData.getAllSets().then((sets) => {
            res.render("sets", {sets: sets}); 
        }).catch((err) => {
            res.status(404).render("404", { message: "Unable to find requested set." });
        });
    }
});

app.get("/lego/sets/:setNum", (req, res) => {
  legoData.getSetByNum(req.params.setNum).then(legoSet => {
      if (legoSet) {
          res.render("set", { set: legoSet }); 
      } else {
          res.status(404).render("404", { message: "Unable to find requested set." });
      }
  }).catch(err => {
      res.status(404).render("404", { message: "Unable to find requested set." });
  });
});


app.get("/lego/addSet", ensureLogin, (req, res) => {
    legoData.getAllThemes()
      .then(themeData => {
        res.render("addSet", { themes: themeData });
      })
      .catch(error => {
        console.error(error);
      });
  });
  
app.post('/lego/addSet', ensureLogin, (req, res) => {
    const setData = req.body;
    legoData.addSet(setData)
      .then(() => {
        res.redirect('/lego/sets');
      })
      .catch(err => {
        console.error(err);
        res.status(500).render("500", { message: `I'm sorry, but we have encountered the following error: ${err.message}` });
      });
  });

app.get("/lego/editSet/:num", ensureLogin, (req, res) => {
    const setNum = req.params.num;
    legoData.getSetByNum(setNum)
      .then(setData => {
        return legoData.getAllThemes()
          .then(themeData => {
            res.render("editSet", { themes: themeData, set: setData });
          });
      })
      .catch(error => {
        console.error(error);
        res.status(404).render("404", { message: "Cannot retrieve set" });
      });
  });

app.post('/lego/editSet', ensureLogin, (req, res) => {
    const setnum = req.body.set_num;
    const data = req.body;
    legoData.editSet(setnum, data)
      .then(() => {
        res.redirect('/lego/sets');
      })
      .catch(err => {
        console.error(err);
        res.status(500).render("500", { message: `I'm sorry, but we have encountered the following error: ${err.message}` });
      });
  });
  
app.get("/lego/deleteSet/:num", ensureLogin, (req, res) => {
    const setNum = req.params.num;
    legoData.deleteSet(setNum)
      .then(() => {
        res.redirect('/lego/sets');
      })
      .catch(err => {
        console.error(err); 
        res.status(500).render("500", { message: `I'm sorry, but we have encountered the following error: ${err.message}` });
      });
  });

 
  app.get("/login", (req, res) => {
    res.render("login", { errorMessage: "", userName: "" });
  });

  app.get("/register", (req, res) => {
    res.render("register", {
      successMessage: "",
      errorMessage: "",
      userName: ""
    });
  });
  
  app.post("/register", (req, res) => {
    authData
      .registerUser(req.body)
      .then(() => {
        res.render("register", {
          successMessage: "User created",
          errorMessage: "",
          userName: ""
        });
      })
      .catch((err) => {
        res.render("register", {
          successMessage: "",
          errorMessage: err,
          userName: req.body.userName
        });
      });
  });

app.post("/login", (req, res) => {
  req.body.userAgent = req.get('User-Agent');
  authData.checkUser(req.body).then(user => {
      req.session.user = {
          userName: user.userName,
          email: user.email,
          loginHistory: user.loginHistory
      };
      res.redirect('/lego/sets');
  }).catch(err => {
      res.render("login", { errorMessage: err, userName: req.body.userName });
  });
});

app.get("/logout", (req, res) => {
  req.session.reset();
  res.redirect('/');
});

app.get("/userHistory", ensureLogin, (req, res) => {
  if (req.session && req.session.user) {
    res.render("userHistory", {
      user: req.session.user 
    });
 }});

app.use((req, res) => {
    res.status(404).render("404", {
        message: "Sorry, we're unable to find what you're looking for.",
    });
  });

  legoData
  .initialize()
  .then(authData.initialize)
  .then(function () {
    app.listen(HTTP_PORT, function () {
      console.log(`app listening on: ${HTTP_PORT}`);
    });
  })
  .catch(function (err) {
    console.log(`unable to start server: ${err}`);
  });