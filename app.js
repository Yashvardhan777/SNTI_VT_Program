const middlewareObj = require("./middleware/index");
const { use } = require("passport");

var express                           = require("express"),
    app                               = express(),
    bodyParser                        = require("body-parser"),
    mongoose                          = require('mongoose'),
    passport                          = require('passport'),
    LocalStrategy                     = require('passport-local'),
    flash                             = require("connect-flash"),
    Student                           = require("./models/student"),
    Guide                           = require("./models/guide"),
    middleware                        = require("./middleware/index"),
    path                              = require("path"),
    crypto                            = require("crypto"),
    multer                            = require("multer"),
    GridFsStorage                     = require("multer-gridfs-storage"),
    Grid                              = require("gridfs-stream"),
    methodOverride                    = require("method-override");


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
//= = = = = = = = = = = = = = = = = = = = = = =  Setting up the app = = = = = = = = = = = = = = = =  
//=================================================================================================

app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(bodyParser.json());


//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Setting up mongoose = = = = = = = = = = = = = = = 
//=================================================================================================


try {
    mongoose.connect("mongodb://localhost/internship_project",{
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true
    }, () =>{
            console.log("connected")
        });
    
} catch (error) {
    console.log(error);
  }

const conn = mongoose.connection;
let gfs;
conn.once('open', ()=>{
    //Init Stream
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
    
})

const storage = new GridFsStorage({
url: "mongodb://localhost/internship_project",
options: {useUnifiedTopology: true},
file: (req, file) => {
    return new Promise((resolve, reject) => {
    crypto.randomBytes(16, (err, buf) => {
        if (err) {
        return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
        filename: filename,
        bucketName: 'uploads'
        };
        resolve(fileInfo);
    });
    });
}
});
const upload = multer({ storage });



//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Student = = = = = = = = = = = = = = = = = = = = = 
//=================================================================================================


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
    gfs.files.find().toArray((err, files)=>{
        //Check if any files 
        if(!files||files.length === 0){
            res.render("studentProject", {files: false, currentUser: currentUser});
        }else{
            // files.map(file => {
            //     if(file.contentType === 'image/jpeg' || file.contentType === "image/png"){
            //         file.isImage = true;
            //     }else{
            //         file.isImage = false;
            //     }
            // });
            Student.findById(req.user._id, function(err, currentUser){
                if(err){
                    console.log(err)
                }else{        
                    console.log(currentUser)
                    res.render("studentProject", {files: files, currentUser: currentUser});
                }
            })
            
        }
    })
    // res.render("studentProject")
    // res.send("Welcome home")
});

//= = = = = = = = = = = = = = = = = = = = = = =  Create New Project = = = = = = = = = = = = = = = = =  
app.get("/projects/new", middleware.isLoggedIn, (req, res)=>{
    res.render("createProjects");
})

//= = = = = = = = = = = = = = = = = = = = = = =  Upload New Project = = = = = = = = = = = = = = = = =  

app.post("/projects", middleware.isLoggedIn,upload.single('file'), (req, res)=>{
    var file = req.file;
    console.log(file);
    var user = req.user;
    var projectDetail = {
        projectName: req.body.projectName,
        projectId  : file.id
    }
    // console.log(user);
    user.projects.push(projectDetail);
    console.log(user);
    // Student.findByIdAndUpdate(req.user._id, req.user.projects = user.projects,function(err, updatedUser){
    //     if(err){
    //         console.log(err)
    //     }else{
            
    //         console.log(updatedUser);
    //     }
    // })
    Student.findById(req.user._id, function(err, updateUser){
        if(err){
            console.log(err)
        }else{        
            updateUser.projects.push(projectDetail)
            console.log(updateUser);
            updateUser.save();
            res.redirect("/projects");
        }
    })

    // req.user.projects.push(file.id)
    // console.log(req.user.projects)
    
})

// = = = = = = = = = = = = = = = = = = = = = = =  Render Image in Project = = = = = = = = = = = = = = 
app.get('/projects/image/:filename', (req, res)=>{
    gfs.files.findOne({filename: req.params.filename}, (err, file)=>{
        //Check if any files 
        if(!file||file.length === 0){
            console.log("No files found")
        }
        //check if image
        if(file.contentType === 'image/jpeg' || file.contentType === "image/png"){
            var readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res);
        }else{
            // res.status(404).json({err: "not an image"})
            console.log("not an image")
        }
    })
}) 

// = = = = = = = = = = = = = = = = = = = = = = =  Delete Project = = = = = = = = = = = = = = = = = 

app.delete('/projects/:id', (req, res)=>{
    gfs.remove({_id: req.params.id, root: 'uploads'}, (err, gridStore)=>{
        if(err){
            console.log(err)
        }
        res.redirect("/");
    })
})


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
    var newStudent = new Student({username: req.body.username, email: req.body.email, guideNo: req.body.guideNo, projects: []});
    Student.register(newStudent, req.body.password, function(err, student){
        if(err || !student){
            console.log(err);
            req.flash("error", err.message);
            res.redirect("/");
            
        } else{
            passport.authenticate("local")(req, res, function(){
                req.flash("success", "Welcome " + student.username);
                res.redirect("/paymentPortal");
                // console.log(student)
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

//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Guide = = = = = = = = = = = = = = = = = = = = = =
//=================================================================================================


//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Login Page = = = = = = = = = = = = = = = = = = = =
//=================================================================================================


//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Registeration Page Page = = = = = = = = = = = = = 
//=================================================================================================


//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Login = = = = = = = = = = = = = = = = = = = = = =
//=================================================================================================

app.post("/loginGuide",middleware.isNotLoggedIn, passport.authenticate("local", {
    successRedirect: "/guide/projects",
    failureRedirect: "/",
    failureFlash:"Inavlid username or password"
}), (req, res)=>{
});

//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Register = = = = = = = = = = = = = = = = = = = = = 
//=================================================================================================

app.post("/register", middleware.isNotLoggedIn, function(req, res){
    var newGuide = new Guide({username: req.body.username, students:[]});
    Guide.register(newGuide, req.body.password, function(err, guide){
        if(err || !guide){
            console.log(err);
            req.flash("error", err.message);
            res.redirect("/");
            
        } else{
            passport.authenticate("local")(req, res, function(){
                req.flash("success", "Welcome " + guide.username);
                res.redirect("/guide/projects");
                console.log(guide)
            });
        };
    });
});

//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Logout = = = = = = = = = = = = = = = = = = = = = =
//=================================================================================================
app.get("/guide/logout", function(req, res){
    req.logOut();
    req.flash("success", "Successfully logged out");
    res.redirect("/");
});

app.listen(3000, () => {
    console.log("app is online")
})