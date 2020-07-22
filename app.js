var express                           = require("express"),
    app                               = express(),
    bodyParser                        = require("body-parser"),
    mongoose                          = require('mongoose'),
    passport                          = require('passport'),
    LocalStrategy                     = require('passport-local'),
    flash                             = require("connect-flash"),
    Student                           = require("./models/student"),
    middleware                        = require("./middleware/index");


//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Express-Session = = = = = = = = = = = = = = = = = 
//=================================================================================================

app.use(require("express-session")({
    secret: "No one shall pass",
    resave: false,
    saveUninitialized: false
}));
app.use(flash());


//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Setting up passport authorization = = = = = = = = 
//=================================================================================================

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(Student.authenticate()));
passport.serializeUser(Student.serializeUser());
passport.deserializeUser(Student.deserializeUser());

 
//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Setting up Flash Message = = = = = = = = = = = = =
//=================================================================================================

app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    res.locals.error     = req.flash("error");
    res.locals.success   = req.flash("success");
    next();  
});


//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Setting up mongoose = = = = = = = = = = = = = = = 
//=================================================================================================


try {
    mongoose.connect("mongodb://localhost/internship_project", {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true
      }, () =>
      console.log("connected"));
  } catch (error) {
    console.log(error);
  }

//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Setting up the app = = = = = = = = = = = = = = = =  
//=================================================================================================

app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({ extended: true }));



//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Home Page = = = = = = = = = = = = = = = = = = = =  
//=================================================================================================

app.get("/", middleware.isNotLoggedIn, (req, res)=>{
    res.render("home")
});

//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Display Projects = = = = = = = = = = = = = = = = =  
//=================================================================================================

app.get("/projects",middleware.isLoggedIn, (req, res)=>{
    res.render("studentProject")
});

//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Payment Portal = = = = = = = = = = = = = = = = =  
//=================================================================================================

app.get("/paymentPortal", middleware.isLoggedIn, (req, res)=>{
    res.render("paymentPortal")
});



//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Login = = = = = = = = = = = = = = = = = = = = = =
//=================================================================================================

app.post("/loginStudent",middleware.isNotLoggedIn, passport.authenticate("local", {
    successRedirect: "/projects",
    failureRedirect: "/",
    failureFlash:"Inavlid username or password"
}), (req, res)=>{
});

//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Register = = = = = = = = = = = = = = = = = = = = = 
//=================================================================================================

app.post("/register", middleware.isNotLoggedIn, function(req, res){
    var newStudent = new Student({username: req.body.username, email: req.body.email, guideNo: req.body.guideNo});
    Student.register(newStudent, req.body.password, function(err, student){
        if(err || !student){
            console.log(err);
            req.flash("error", err.message);
            res.redirect("/");
            
        } else{
            passport.authenticate("local")(req, res, function(){
                req.flash("success", "Welcome " + student.username);
                res.redirect("/paymentPortal");
                console.log(student)
            });
        };
    });
});

//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Logout = = = = = = = = = = = = = = = = = = = = = =
//=================================================================================================
app.get("/logout", function(req, res){
    req.logOut();
    req.flash("success", "Successfully logged out");
    res.redirect("/");
});

app.listen(3000, () => {
    console.log("app is online")
})