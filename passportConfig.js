const LocalStrategy = require("passport-local").Strategy;
const { client } = require("./index.js");
const bcrypt = require("bcrypt");

function initialize(passport) {
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
}

module.exports=initialize;