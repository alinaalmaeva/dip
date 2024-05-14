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
const Chart = require('chart.js');



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
app.use(express.json())

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

    const result = await client.query('SELECT id_zaivka, oborydovanie.invert_number, users.firstname, ispolnitel.familiy, date_start, date_finish, status.name_status FROM zaivka JOIN status ON zaivka.status = status.id_status JOIN users ON zaivka.fk_zaivitel = users.id JOIN oborydovanie ON zaivka.fk_invert_number = oborydovanie.id_oboryd  left JOIN ispolnitel ON zaivka.fk_ispolnitel = ispolnitel.id_ispolnitel ORDER BY date_start desc');
    result.rows.forEach(row => {
      row.date_start = row.date_start ? row.date_start.toLocaleDateString() : null,
      row.date_finish= row.date_finish ? row.date_finish.toLocaleDateString() : null
    });
    res.render("zaiv_zaiv", {user: req.user.name, data: result.rows});
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
    return;
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
    if (!firstname|| !name || !email || !password || !password2) {
        errors.push({ message: "Заполните все поля" });
      }
    
      if (password.length < 6) {
        errors.push({ message: "Пароль должен содержать больше 6 символов" });
      }
    
      if (password !== password2) {
        errors.push({ message: "Пароли не совпадают" });
      }
    
      if (errors.length > 0) {
        res.render("register", { errors, firstname, name, email, password, password2 });
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
            client.query(`INSERT INTO users (firstname, name, email, password) VALUES ($1, $2, $3, $4) RETURNING id, password`,
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

app.post("/users/new_zaiv", async(req, res)=>{
  const text = req.body.text;
  const status = 3;
  var d = new Date();
  const date_start =("0" + d.getDate()).slice(-2) +"."+ ("0" + (Number(d.getMonth())+1)).slice(-2) + "." + d.getFullYear();
  
  const userResult = await client.query('SELECT id FROM users WHERE firstname = $1', [req.user.firstname]);
if (userResult.rows.length === 0) {
  return res.status(400).send('User not found');
}
const fk_zaivitel = userResult.rows[0].id;

const oborydResult = await client.query('SELECT id_oboryd FROM oborydovanie WHERE invert_number = $1', [req.body.invert_number]);
if (oborydResult.rows.length === 0) {
  return res.status(400).send('Oborydovanie not found');
}
const fk_invert_number = oborydResult.rows[0].id_oboryd;
console.log(fk_invert_number);

try {
  await client.query('INSERT INTO zaivka (fk_invert_number, fk_zaivitel, date_start, status, text) VALUES ($1, $2, $3, $4, $5)', [fk_invert_number, fk_zaivitel, date_start, status, text]);
  const results = await client.query(`SELECT * FROM oborydovanie`);
  res.render("new_zaiv", { user: req.user.name, data: results.rows });
  console.log("Заявка успешно создана");
} catch (err) {
  console.error(err);
  res.status(500).send("Ошибка принии заявки");
}

});



app.get("/users/new_zaiv", async(req, res)=>{
  const results = await client.query(`SELECT * FROM oborydovanie`);
res.render("new_zaiv", {user: req.user.name, data: results.rows});
return;
});

app.get("/users/analitic", async(req, res)=>{
  const candlestickData = [
    { open: 100, high: 120, low: 80, close: 110 },
    { open: 110, high: 130, low: 90, close: 120 },
    { open: 120, high: 140, low: 100, close: 130 }

  ];
  const month= req.query.month;
  const vupPromise = await client.query(`SELECT COUNT(*) FROM zaivka WHERE status=1 AND extract(month from date_start) = 5`);
  console.log(req.query.month);
  const rabPromise = await client.query(`SELECT COUNT(*) FROM zaivka WHERE status=2 AND extract(month from date_start) = 5`);
  const ogidPromise =await client.query(`SELECT COUNT(*) FROM zaivka WHERE status=3 AND extract(month from date_start) = 5`);

  Promise.all([vupPromise, rabPromise, ogidPromise])
    .then(data => {
      const vup = data[0].rows[0].count;
      const rab = data[1].rows[0].count;
      const ogid = data[2].rows[0].count;
      console.log("Ожидает"+ogid);
     res.render("analitic", {user: req.user.name, vup:vup, rab:rab, ogid:ogid, candlestickData: JSON.stringify(candlestickData)});

    })
 
});

app.post('/users/analitic', (req, res)=>{
  const vupPromise = client.query(`SELECT COUNT(*) FROM zaivka WHERE status=1 AND extract(month from date_start) = 5`);
  const rabPromise = client.query(`SELECT COUNT(*) FROM zaivka WHERE status=2 AND extract(month from date_start) = 5`);
  const ogidPromise =client.query(`SELECT COUNT(*) FROM zaivka WHERE status=3 AND extract(month from date_start) = 5`);
  Promise.all([vupPromise, rabPromise, ogidPromise])
   .then(data => {
    const ogid = parseInt(data[2].rows[0].count, 10); // Преобразуем строку в число
    const vup = parseInt(data[0].rows[0].count, 10);
    const rab = parseInt(data[1].rows[0].count, 10);

  
    const otn=(vup/(ogid+rab+vup))*100;

  const reportContent = `Отчет за месяц\n\nЗаявок в ожидании: ${ogid}\nЗаявок в работе: ${rab}\nЗаявок выполненных: ${vup} \n\nПроцент выполненнх заявок: ${otn}%`;

  res.send(reportContent)
})
});


app.get("/users/sotryd", async(req, res)=>{
  const results = await client.query(`SELECT * FROM ispolnitel`);
res.render("sotryd", {user: req.user.name, data: results.rows});
return;
});

app.get("/users/sklad", async(req, res)=>{
  const results = await client.query(`SELECT id_sklad, oborydovanie.name, oborydovanie.invert_number, kol_vo  FROM sklad 
  JOIN oborydovanie ON sklad.oborydovanie = oborydovanie.id_oboryd and sklad.invert_number = oborydovanie.id_oboryd ORDER BY id_sklad`);
res.render("sklad", {user: req.user.name, data: results.rows});
return;
});



app.get("/users/zaivka-page/:id", async(req, res)=>{
  const id_zaivka = req.params.id;
  // Здесь Вы должны получить данные заявки из Вашей базы данных, используя id_zaivka

    const zaivk = await client.query(`SELECT id_zaivka, oborydovanie.invert_number, users.firstname, ispolnitel.familiy, date_start, date_finish, status.name_status, text FROM zaivka JOIN status ON zaivka.status = status.id_status JOIN users ON zaivka.fk_zaivitel = users.id JOIN oborydovanie ON zaivka.fk_invert_number = oborydovanie.id_oboryd  left JOIN ispolnitel ON zaivka.fk_ispolnitel = ispolnitel.id_ispolnitel WHERE id_zaivka = $1`,[id_zaivka]);

    if (zaivk.rows.length === 0) {
      return res.status(404).send('Заявка не найдена');
    }

   zaivk.rows.forEach(row => {
      row.date_start = row.date_start ? row.date_start.toLocaleDateString() : null,
      row.date_finish= row.date_finish ? row.date_finish.toLocaleDateString() : null
    });
    const zaivka = zaivk.rows[0];

  res.render("zaivka-page", { user: req.user.name, zaivka });

return;
});


app.post('/users/zaivka-page/:id', async (req, res)=>{
  const id_zaivka = req.params.id;
  // Здесь Вы должны получить данные заявки из Вашей базы данных, используя id_zaivka

    const zaivk = await client.query(`SELECT id_zaivka, oborydovanie.invert_number, users.firstname, ispolnitel.familiy, date_start, date_finish, status.name_status, text FROM zaivka JOIN status ON zaivka.status = status.id_status JOIN users ON zaivka.fk_zaivitel = users.id JOIN oborydovanie ON zaivka.fk_invert_number = oborydovanie.id_oboryd  left JOIN ispolnitel ON zaivka.fk_ispolnitel = ispolnitel.id_ispolnitel WHERE id_zaivka = $1`,[id_zaivka]);
    if (zaivk.rows.length === 0) {
      return res.status(404).send('Заявка не найдена');
    }

   zaivk.rows.forEach(row => {
      row.date_start = row.date_start ? row.date_start.toLocaleDateString() : null,
      row.date_finish= row.date_finish ? row.date_finish.toLocaleDateString() : null
    });
    const zaivka = zaivk.rows[0];

  const reportContent = `Акт выполненных работ \n\n\nЗаявка № ${zaivka.id_zaivka}\n\n\nИнвентарный номер: ${zaivka.invert_number} \n\nЗаявитель: ${zaivka.firstname}  \n\nИсполнитель: ${zaivka.familiy}\n\nСтатус заявки: ${zaivka.name_status}  \n\nДата начала: ${zaivka.date_start} \n\nДата завершения: ${zaivka.date_finish} \n\nКомментарий: ${zaivka.text} `;

  res.send(reportContent)

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


const client = new Client({
  host: "localhost",
 user: "postgres",
  port: 5432, 
 password: "1",
 database: "desk"
})

client.connect();

module.exports = { client: client };
