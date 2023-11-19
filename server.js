
const express = require("express");
const path = require("path");

const legoData = require("./modules/legoSets");


const app = express();
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 8080;
app.set('views', path.join(__dirname, 'views'));

app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/about", (req, res) => {
  res.render("about");
});

app.get("/lego/sets", (req, res) => {
  if (req.query.theme) {
    legoData
      .getSetsByTheme(req.query.theme)
      .then((data) => {
        res.render("sets", { sets: data });
      })
      .catch((err) =>
        res.status(404).render("404", {
          message: "No Sets found for a matching theme",
        })
      );
  }

  legoData
    .getAllSets()
    .then((data) => res.render("sets", { sets: data }))
    .catch((err) => {
      console.log(err);
      res.status(404).render("404", {
        message: "I'm sorry, we're unable to find what you're looking for",
      });
    });
});

app.get("/lego/sets/:id", (req, res) => {
  legoData
    .getSetByNum(req.params.id)
    .then((data) => res.render("set", { set: data }))
    .catch((err) =>
      res.status(404).render("404", {
        message: "No Sets found for a specific set num",
      })
    );
});

app.get("/lego/addSet", (req, res) => {
  legoData
    .getAllThemes()
    .then((themeData) => res.render("addSet", { themes: themeData }))
    .catch((err) =>
      res.status(404).render("404", {
        message: `${err.message}`,
      })
    );
});

app.post("/lego/addSet", (req, res) => {
  legoData.addSet(req.body) // req.body contains the form data
    .then(() => res.redirect("/lego/sets"))
    .catch((err) => {
      // Log the error for debugging purposes
      console.error(err);

      // Render a 500 error page or similar
      res.status(500).render("500", {
        message: `I'm sorry, but we have encountered the following error: ${err}`,
      });
    });
});

// GET route to display the form
app.get('/lego/editSet/:num', async (req, res) => {
  try {
    const [set, themes] = await Promise.all([
      legoData.getSetByNum(req.params.num),
      legoData.getAllThemes(),
    ]);

    res.render('editSet', { set, themes });
  } catch (error) {
    res.status(404).render('404', { message: error.message });
  }
});

// POST route to update the set
app.post('/lego/editSet', async (req, res) => {
  try {
    const setData = {
      name: req.body.name,
      year: req.body.year,
      num_parts: req.body.num_parts,
      img_url: req.body.img_url,
      theme_id: req.body.theme_id,
      set_num: req.body.set_num,
    };

    await legoData.editSet(req.body.set_num, setData);

    res.redirect('/lego/sets');
  } catch (error) {
    res.status(500).render('500', { message: `Error editing set: ${error.message}` });
  }
});


app.get("/lego/deleteSet/:num", async (req, res) => {
  legoData
    .deleteSet(req.params.num)
    .then(() => res.redirect("/lego/sets"))
    .catch((err) =>
      res.render("500", {
        message: `I'm sorry, but we have encountered the following error: ${err}`,
      })
    );
});


app.use((req, res) => {
  res.status(404).render("404", {
    message: "No view matched for a specific route",
  });
});

legoData
  .initialize()
  .then(() => app.listen(PORT, () => console.log(`listening on port ${PORT}`)))
  .catch((error) => console.log(`Failed to listen on port ${PORT}`));