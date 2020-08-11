var express                           = require("express"),
    app                               = express(),
    bodyParser                        = require("body-parser"),
    mongoose                          = require('mongoose'),
    passport                          = require('passport'),
    LocalStrategy                     = require('passport-local'),
    flash                             = require("connect-flash"),
    Student                           = require("./models/student"),
    Guide                             = require("./models/guide"),
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
passport.use("studentlocal", new LocalStrategy(Student.authenticate()));
app.use(passport.initialize());
app.use(passport.session());
passport.use("guidelocal", new LocalStrategy(Guide.authenticate()));
passport.serializeUser(function(user, done) { 
    done(null, user);
  });
passport.deserializeUser(function(user, done) {
    if(user!=null)
      done(null,user);
  });
 
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
        
            Student.findById(req.user._id, function(err, currentUser){
                if(err){
                    console.log(err)
                }else{        
                    console.log(currentUser)
                    if(!files||files.length === 0){
                        res.render("Student/studentProject", {files: false, currentUser: currentUser});
                    }else{
                        res.render("Student/studentProject", {files: files, currentUser: currentUser});
                }
            }
            
        })
    })
});

//= = = = = = = = = = = = = = = = = = = = = = =  Create New Project = = = = = = = = = = = = = = = = =  

app.get("/projects/new", middleware.isLoggedIn, (req, res)=>{
    res.render("Student/createProjects");
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
    user.projects.push(projectDetail);
    console.log(user);
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

app.get("/student/:id/payment", middleware.isLoggedIn, (req, res)=>{
    var studentId = req.params.id;
    Student.findById(studentId, function(err, student){
        if(err){
            console.log(err)
        }else if(!student){
            console.log("Student Not Found");
        }else{
            res.render("Student/paymentPortal", {student: student});
        }
    })
});

app.post("/student/:id/payment", middleware.isLoggedIn, (req, res)=>{
    var studentId = req.params.id;
    Student.findById(studentId, function(err, student){
        if(err){
            console.log(err)
        }else if(!student){
            console.log("Student Not Found");
        }else{
            student.payment = true;
            student.save();
            res.render("Student/paymentPortal", {student: student});
        }
    })
});

//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Guide Approval = = = = = = = = = = = = = = = = =  
//=================================================================================================

app.get("/student/:id/approval", middleware.isLoggedIn, (req, res)=>{
    var studentId = req.params.id;
    Student.findById(studentId, function(err, student){
        if(err){
            console.log(err)
        }else if(!student){
            console.log("Student Not Found");
        }else{
            res.render("Student/guideApproval", {student: student});
        }
    })
});

//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Login = = = = = = = = = = = = = = = = = = = = = =
//=================================================================================================

app.post("/loginStudent",middleware.isNotLoggedIn, passport.authenticate("studentlocal", {
    failureFlash: "Inavlid Username or Password",
    failureRedirect: "/"
}), (req, res)=>{
    if(!req.user.payment){
        res.redirect("/student/" + req.user._id + "/payment");
    }else if(!req.user.approval){
        res.redirect("/student/" + req.user._id + "/approval");
    }else{
        res.redirect("/projects");
    }
});

//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Register = = = = = = = = = = = = = = = = = = = = = 
//=================================================================================================

app.get("/register", middleware.isNotLoggedIn, function(req, res){
    res.render("StudentRegister");
})

app.post("/register", middleware.isNotLoggedIn, function(req, res){
    // Verifying Guide No.
    Guide.findOne({guideNo : req.body.guideNo}, function(err, guide){
        if(err){
            console.log(err);
            res.redirect("/");

        }else if(!guide){
            console.log("GuideNo. Invalid");
            res.redirect("/");
        }else{
            var newStudent = new Student({
                    username: req.body.username, 
                    email: req.body.email, 
                    guideNo: req.body.guideNo, 
                    institute: req.body.institute, 
                    branch: req.body.branch, 
                    duration: req.body.duration, 
                    startDate: req.body.startDate, 
                    projects: [], 
                    payment: false, 
                    approval: false
                });
            Student.register(newStudent, req.body.password, function(err, student){
                if(err || !student){
                console.log(err);
                req.flash("error", err.message);
                res.redirect("/");
                
                } else{
                    passport.authenticate("studentlocal")(req, res, function(){
                        req.flash("success", "Welcome " + student.username);
                        Guide.findOne({guideNo : req.body.guideNo}, function(err, guide){
                            if(err||!guide){
                                console.log(err)
                            }else{
                                guide.students.push(student._id);
                                guide.save();
                            }
                        })
                        res.redirect("/student/"+ student._id +"/payment");
                    });
                };
            });
        }
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
//= = = = = = = = = = = = = = = = = = = = = = =  Home Page = = = = = = = = = = = = = = = = = = = =
//=================================================================================================

app.get("/guide",middleware.isNotLoggedInGuide,  (req, res)=>{
    res.render("Guide/guidehome");
})

//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Projects = = = = = = = = = = = = = = = = = = = =
//=================================================================================================

app.get("/guide/projects", middleware.isLoggedInGuide,(req, res)=>{
    const studentList = new Array();
    var guide = req.user;
    guide.students.forEach(studentId => {
        Student.findById(studentId, (err, studentInfo)=>{
            if(err||!studentInfo){
                console.log(err);
            }else{
                studentList.push(studentInfo);
                
            }
        })
    });

    gfs.files.find().toArray((err, files)=>{
        //Check if any files
        Guide.findById(req.user._id, function(err, currentGuide){
            if(err||!currentGuide){
                console.log(err);

            }else{      
                if(!files||files.length === 0){
                    res.render("Guide/guideProject", {files: false, currentGuide: currentGuide, studentList: studentList});
                }else{
                    res.render("Guide/guideProject", {files: files, currentGuide: currentGuide, studentList: studentList});
                }
            }
            
        })
    })
})

//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Approval = = = = = = = = = = = = = = = = = = = =
//=================================================================================================

app.get("/guide/student/pending", middleware.isLoggedInGuide,(req, res)=>{
    Student.find({approval: false}, function(err, allStudentsPending){
        if(err){
            console.log(err);
        }else{
            console.log(allStudentsPending);
            res.render("Guide/pendingApprovals", {studentList: allStudentsPending});
        }
    })
})

app.post("/guide/approve/:id", middleware.isLoggedInGuide, (req, res)=>{
    var studentId = req.params.id;
    Student.findById(studentId, function(err, student){
        if(err){
            console.log(err)
        }else if(!student){
            console.log("Student Not Found");
        }else{
            console.log(student);
            student.approval = true;
            student.save();
            console.log(student);
            
        }
    res.redirect("/guide/student/pending")
    })    
})
//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Download Project = = = = = = = = = = = = = = = = = 
//=================================================================================================

app.get('/guide/download/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
      // Check if file
      if (!file || file.length === 0) {
        return res.status(404).json({
          err: 'No file exists'
        });
      }
      // File exists
      res.set('Content-Type', file.contentType);
      res.set('Content-Disposition', 'attachment; filename="' + file.filename + '"');
      // streaming from gridfs
      var readstream = gfs.createReadStream({
        filename: req.params.filename
      });
      //error handling, e.g. file does not exist
      readstream.on('error', function (err) {
        console.log('An error occurred!', err);
        throw err;
      });
      readstream.pipe(res);
    });
  });

//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Login = = = = = = = = = = = = = = = = = = = = = =
//=================================================================================================

app.post("/guide/login",middleware.isNotLoggedInGuide, passport.authenticate("guidelocal", {
    successRedirect: "/guide/projects",
    failureRedirect: "/guide",
    failureFlash:"Inavlid username or password"
}), (req, res)=>{
});

//=================================================================================================
//= = = = = = = = = = = = = = = = = = = = = = =  Register = = = = = = = = = = = = = = = = = = = = = 
//=================================================================================================

app.post("/guide/register", middleware.isNotLoggedInGuide, function(req, res){
    var newGuide = new Guide({username: req.body.username, guideNo: req.body.guideNo,students:[]});
    Guide.register(newGuide, req.body.password, function(err, guide){
        if(err || !guide){
            console.log(err);
            req.flash("error", err.message);
            res.redirect("/guide");
            
        } else{
            passport.authenticate("guidelocal")(req, res, function(){
                console.log(guide)
                req.flash("success", "Welcome " + guide.username);
                res.redirect("/guide/projects");
                
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
    res.redirect("/guide");
});

app.listen(3000, () => {
    console.log("app is online")
})