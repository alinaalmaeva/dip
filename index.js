var express = require('express');
const app = express();
var server = require('http').createServer(app);
const path = require('path');
const {Client} = require('pg');
const bcrypt = require("bcrypt");
const flash = require("express-flash");
const session = require("express-session");
require("dotenv").config();
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;


//Проверка польльзователя на вход в систему
  console.log("Initialized");

  const authenticateUser = (email, password, done) => {
    console.log(email, password);
    if (client && client.query) {
        
    client.query(`SELECT * FROM users WHERE email = $1`, [email],(err, results) => {
          if (err) {
            console.error("Ошибка при выполнении запроса:", err);
    return done(err);
          }
          console.log(results.rows);

        if (results.rows.length > 0) {
          const user = results.rows[0];

          bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
              console.log(err);
            }

            if(isMatch){
                return done(null, user);
            }else{
                return done(null, false, {message:"Пароль не правильный"});
            }
        });
    }else{
        return done(null, false, {message:"Пользователь не зарегистрирован"});
    }
}
   );
} else {
    console.error('Клиент не определен');
}
};

passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      authenticateUser
    )
  );
  passport.serializeUser((user, done)=>done(null,user.id));

  passport.deserializeUser((id, done) => {
    client.query(`SELECT * FROM users WHERE id = $1`, [id], (err, results) => {
      if (err) {
        return done(err);
      }
      console.log(`ID is ${results.rows[0].id}`);
      return done(null, results.rows[0]);
    });
  });


  //Указывает порт
app.use(express.static(path.join(__dirname, 'public')));
//app.use('/node_modeles/', express.static(path.join(__dirname, 'node_models')));


server.listen(3000);

app.use(session({
      // Key we want to keep secret which will encrypt all of our information
      secret: process.env.SESSION_SECRET,
      // Should we resave our session variables if nothing has changes which we dont
      resave: false,
      // Save empty value if there is no vaue which we do not want to do
      saveUninitialized: false
    })
  );
  app.use(flash());

app.set("view engine", "ejs");
app.use(express.urlencoded({extended:false}));

app.use(passport.initialize());
app.use(passport.session());


app.get("/users/register", checkAuthenticated, (req, res)=>{
    res.render("register");
});

app.get("/",checkAuthenticated,(req, res)=>{
    res.render("login");
});

app.get("/users/zaiv_zaiv", checkNotAuthenticated, async(req, res)=>{
  try {
    // Выполните запрос к базе данных

    const result = await client.query('SELECT id_zaivka, oborydovanie.invert_number,zaivitel.family, ispolnitel.familiy, date_start, date_finish, status.name_status FROM zaivka JOIN status ON zaivka.status = status.id_status JOIN zaivitel ON zaivka.fk_zaivitel = zaivitel.id_zaivitel JOIN oborydovanie ON zaivka.fk_invert_number = oborydovanie.id_oboryd JOIN ispolnitel ON zaivka.fk_ispolnitel = ispolnitel.id_ispolnitel');
    result.rows.forEach(row => {
      row.date_start = row.date_start ? row.date_start.toLocaleDateString() : null,
      row.date_finish= row.date_finish ? row.date_finish.toLocaleDateString() : null
    });
    res.render("zaiv_zaiv", {user: req.user.name, data: result.rows});
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});



app.post("/users/register", async (req, res) => {
    let {firstname, name, email, password, password2 } = req.body;
  
    console.log({
      firstname,
      name,
      email,
      password,
      password2
    });

    let errors = [];
    if (!firstname || !name || !email || !password || !password2) {
        errors.push({ message: "Заполните все поля" });
      }
    
      if (password.length < 6) {
        errors.push({ message: "Пароль должен содержать больше 6 символов" });
      }
    
      if (password !== password2) {
        errors.push({ message: "Пароли не совпадают" });
      }
    
      if (errors.length > 0) {
        res.render("register", { errors, name, email, password, password2 });
      }
      else{
       let hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);
     // Validation passed
     client.query(`SELECT * FROM users WHERE email = $1`,
        [email],
        (err, results) => {
          if (err) {
            console.log(err);
          }
          console.log(results.rows);
          if (results.rows.length > 0) {
           errors.push({message: "Email уже зарегистрирован"});
           res.render("register", {errors});
        }else{
            client.query(`INSERT INTO users (firstname, name, email, password) VALUES ($1, $2, $3) RETURNING id, password`,
                [firstname, name, email, hashedPassword],
                (err, results) => {
                  if (err) {
                    throw err;
                  }
                  console.log(results.rows);
                  req.flash("success_msg", "Вы зарегистрировались. Войдите в систему.");
                  res.redirect("/");
                }
              );
        }
      });
}
});

app.post("/", passport.authenticate("local",{
successRedirect:"/users/zaiv_zaiv",
failureRedirect:"/",
failureFlash:true
})
);

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/users/zaiv_zaiv");
  }
  next();
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
}


//const client = new Client({
//    host: "localhost",
  //  user: "postgres",
//    port: 5432, 
 //   password: "1",
 //   database: "desk"
//})

//client.connect();

//module.exports = { client: client };
